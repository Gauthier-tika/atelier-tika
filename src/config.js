const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const wm = require('./wm')
const { readJson, writeJson } = require('./store')

const home = os.homedir()
const bundled = name => path.join(__dirname, '..', 'bin', name)
const expand = p => p.replace(/^~(?=$|\/)/, home)
const tilde = p => p === home || p.startsWith(home + '/') ? '~' + p.slice(home.length) : p

const jiraEnvFile = path.join(home, '.config/atelier/jira.env')
const legacyJiraEnvFile = path.join(home, '.config/jira-time/env')

const defaults = {
  jiraBase: null,
  jiraEnv: jiraEnvFile,
  jiraTimeBin: bundled('jira-time'),
  dailyHours: 7,
  boardId: null,
  columnLabels: {
    'In Progress / PR': 'In progress',
    'RECETTE PO': 'Recette PO',
    'RECETTE MéTIER': 'Recette métier',
    'A MEPP': 'À MEPP',
    'A MEP': 'À MEP'
  },
  filters: [],
  unassignedColumns: ['To Do'],
  mineColumns: null,
  hiddenColumns: [],
  columnColors: {},
  verificationField: null,
  qualif: null,
  githubOrg: 'Tikamoon',
  reviewRepos: [],
  devDir: '~/Dev',
  repoDir: '~/Dev/modulo',
  claudeSessionsBin: bundled('claude-sessions'),
  qualifSyncBin: bundled('qualif-sync'),
  claudeCommand: 'claude',
  editor: { command: 'nvim', args: ['.'], mode: 'pane' },
  terminal: null,
  startPrompt: '/jira {key}',
  reviewPrompt: '/review {number}',
  workflows: [],
  pollSeconds: 120,
  theme: null
}

const editors = [
  { name: 'nvim', command: 'nvim', args: ['.'], mode: 'pane' },
  { name: 'Vim', command: 'vim', args: ['.'], mode: 'pane' },
  { name: 'Helix', command: 'hx', args: ['.'], mode: 'pane' },
  { name: 'PhpStorm', command: 'phpstorm', args: ['{dir}'], mode: 'window' },
  { name: 'VS Code', command: 'code', args: ['{dir}'], mode: 'window' },
  { name: 'Zed', command: 'zed', args: ['{dir}'], mode: 'window' }
]

const file = path.join(home, '.config/atelier/config.json')

const readUser = () => readJson(file, {})

const QUALIF_MAX = 99

const qualifDefaults = {
  label: 'Qualif',
  count: 10,
  url: null,
  branch: 'qualif-{login}-{n}',
  base: 'main',
  repo: null,
  workflow: null,
  inputs: {},
  jiraField: null,
  cache: null
}

function cleanQualif(user) {
  if (!user || typeof user !== 'object') return null
  const { enabled, ...qualif } = { ...qualifDefaults, ...user }
  qualif.count = Math.max(1, Math.min(QUALIF_MAX, Math.floor(Number(qualif.count)) || qualifDefaults.count))
  qualif.inputs = qualif.inputs && typeof qualif.inputs === 'object' ? Object.fromEntries(Object.entries(qualif.inputs).map(([k, v]) => [k, String(v)])) : {}
  const commands = (Array.isArray(qualif.cache?.commands) ? qualif.cache.commands : [])
    .filter(command => Array.isArray(command) && command.length && command.every(part => typeof part === 'string'))
  qualif.cache = commands.length ? { description: qualif.cache.description || '', commands } : null
  return qualif
}

const columnList = value => (Array.isArray(value) ? value : []).filter(c => typeof c === 'string')
const textOrNull = value => String(value ?? '').trim() || null

const cleanFilters = filters => (Array.isArray(filters) ? filters : [])
  .filter(f => f && typeof f.label === 'string' && f.label.trim())
  .map(f => ({ label: f.label.trim(), columns: columnList(f.columns), ...(f.icon ? { icon: String(f.icon) } : {}) }))

function parseInputs(text) {
  const inputs = {}
  for (const line of String(text || '').split('\n').map(l => l.trim()).filter(Boolean)) {
    const match = line.match(/^([\w-]+)\s*=\s*(.*)$/)
    if (!match) throw new Error(`Write each workflow input as name=value, not "${line}"`)
    inputs[match[1]] = match[2]
  }
  return Object.keys(inputs).length ? inputs : null
}

function qualifCount(value) {
  const count = Number(value)
  if (!Number.isInteger(count) || count < 1 || count > QUALIF_MAX) throw new Error(`The number of qualifs goes from 1 to ${QUALIF_MAX}`)
  return count
}

function namedFilters(filters) {
  if (!Array.isArray(filters) || filters.some(f => !String(f?.label || '').trim())) throw new Error('Give every filter a name')
  return cleanFilters(filters)
}

const settings = {
  unassignedColumns: { clean: columnList, reload: ['jira'] },
  mineColumns: { clean: value => Array.isArray(value) ? columnList(value) : null },
  filters: { clean: cleanFilters, set: namedFilters },
  'qualif.enabled': { set: value => value ? null : false, reload: ['jira', 'deploys'] },
  'qualif.label': { set: textOrNull },
  'qualif.count': { set: qualifCount },
  'qualif.url': { set: textOrNull },
  'qualif.base': { set: textOrNull },
  'qualif.branch': { set: textOrNull, reload: ['deploys'] },
  'qualif.repo': { set: textOrNull, reload: ['deploys'] },
  'qualif.workflow': { set: textOrNull, reload: ['deploys'] },
  'qualif.inputs': { set: parseInputs },
  'qualif.jiraField': { set: textOrNull, reload: ['jira'] }
}

function applyQualif(config, user) {
  config.qualifSettings = cleanQualif(user)
  config.qualif = user?.enabled === false ? null : config.qualifSettings
}

function setSetting(config, key, value) {
  const setting = Object.hasOwn(settings, key) ? settings[key] : null
  if (!setting) throw new Error(`Unknown setting ${key}`)
  const cleaned = (setting.set || setting.clean)(value)
  const [section, field] = key.split('.')
  if (field) {
    const user = { ...readUser()[section] }
    if (cleaned === null) delete user[field]
    else user[field] = cleaned
    save({ [section]: user })
    applyQualif(config, user)
  } else {
    config[key] = cleaned
    save({ [key]: cleaned })
  }
  return setting.reload || []
}

const stageIcons = { mepp: 'flask', mep: 'rocket' }

function migrate(user) {
  const changes = {}
  if (user.stageColumns) {
    const labels = { ...defaults.columnLabels, ...user.columnLabels }
    if (!user.filters) changes.filters = Object.entries(user.stageColumns).map(([stage, column]) => ({ label: labels[column] || column, columns: [column], ...(stageIcons[stage] ? { icon: stageIcons[stage] } : {}) }))
    changes.stageColumns = null
  }
  if ('unassignedColumn' in user) {
    if (!user.unassignedColumns && user.unassignedColumn) changes.unassignedColumns = [user.unassignedColumn]
    changes.unassignedColumn = null
  }
  if ('qualifField' in user) {
    if (user.qualif && !user.qualif.jiraField && user.qualifField) changes.qualif = { ...user.qualif, jiraField: user.qualifField }
    changes.qualifField = null
  }
  if (!Object.keys(changes).length) return user
  save(changes)
  return readUser()
}

function load() {
  const user = migrate(readUser())
  const config = { ...defaults, ...user, columnLabels: { ...defaults.columnLabels, ...user.columnLabels } }
  for (const key of ['filters', 'unassignedColumns', 'mineColumns']) config[key] = settings[key].clean(config[key])
  applyQualif(config, user.qualif)
  config.jiraBase = config.jiraBase ? String(config.jiraBase).replace(/\/+$/, '') : null
  config.jiraEnvLegacy = !user.jiraEnv && !fs.existsSync(jiraEnvFile) && fs.existsSync(legacyJiraEnvFile)
  if (config.jiraEnvLegacy) config.jiraEnv = legacyJiraEnvFile
  for (const key of ['jiraEnv', 'jiraTimeBin', 'devDir', 'repoDir', 'claudeSessionsBin', 'qualifSyncBin'])
    config[key] = expand(config[key])
  config.repoName = path.basename(config.repoDir)
  config.githubRepo = `${config.githubOrg}/${config.repoName}`
  config.editor = { ...defaults.editor, ...user.editor }
  config.editor.command = expand(config.editor.command)
  config.editor.name ||= path.basename(config.editor.command)
  config.terminal = user.terminal?.command ? { args: [], ...user.terminal, command: expand(user.terminal.command) } : { ...wm.terminal }
  config.terminal.name ||= path.basename(config.terminal.command)
  config.workflows = (Array.isArray(config.workflows) ? config.workflows : [])
    .filter(w => w?.id && w.prompt)
    .map(w => ({ ...w, id: String(w.id), label: w.label || String(w.id), cwd: expand(w.cwd || config.repoDir) }))
  return config
}

// Sets (or, with null, removes) top-level keys in the user's config.json, leaving the others as written.
function save(changes) {
  const user = readUser()
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete user[key]
    else user[key] = value
  }
  writeJson(file, user)
}

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match)

const editorArgs = (editor, dir) => editor.args.map(arg => fill(arg, { dir }))
const terminalArgs = (terminal, values) => terminal.args.map(arg => fill(arg, values))

module.exports = { load, save, setSetting, expand, tilde, editors, editorArgs, terminalArgs, cleanFilters, cleanQualif, parseInputs, jiraEnvFile, fill, QUALIF_MAX }
