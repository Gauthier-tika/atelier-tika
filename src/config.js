const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const wm = require('./wm')

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
  qualifField: 'customfield_10253',
  verificationField: 'customfield_10451',
  qualifKubeContext: 'gke_tikamoon-qualif_europe-west1_cluster-tikamoon-qualif',
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

function readUser() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

const stageIcons = { mepp: 'flask', mep: 'rocket' }

const cleanFilters = filters => (Array.isArray(filters) ? filters : [])
  .filter(f => f && typeof f.label === 'string' && f.label.trim())
  .map(f => ({ label: f.label.trim(), columns: (Array.isArray(f.columns) ? f.columns : []).filter(c => typeof c === 'string'), ...(f.icon ? { icon: String(f.icon) } : {}) }))

function load() {
  const user = readUser()
  const config = { ...defaults, ...user, columnLabels: { ...defaults.columnLabels, ...user.columnLabels } }
  if (!user.filters && user.stageColumns)
    config.filters = Object.entries(user.stageColumns).map(([stage, column]) => ({ label: config.columnLabels[column] || column, columns: [column], ...(stageIcons[stage] ? { icon: stageIcons[stage] } : {}) }))
  if (!user.unassignedColumns && user.unassignedColumn) config.unassignedColumns = [user.unassignedColumn]
  config.filters = cleanFilters(config.filters)
  config.unassignedColumns = (Array.isArray(config.unassignedColumns) ? config.unassignedColumns : []).filter(c => typeof c === 'string')
  config.mineColumns = Array.isArray(config.mineColumns) ? config.mineColumns.filter(c => typeof c === 'string') : null
  config.jiraBase = config.jiraBase ? String(config.jiraBase).replace(/\/+$/, '') : null
  config.jiraEnvLegacy = !user.jiraEnv && !fs.existsSync(jiraEnvFile) && fs.existsSync(legacyJiraEnvFile)
  if (config.jiraEnvLegacy) config.jiraEnv = legacyJiraEnvFile
  for (const key of ['jiraEnv', 'jiraTimeBin', 'devDir', 'repoDir', 'claudeSessionsBin', 'qualifSyncBin'])
    config[key] = expand(config[key])
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
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file + '.tmp', JSON.stringify(user, null, 2) + '\n')
  fs.renameSync(file + '.tmp', file)
}

const editorArgs = (editor, directory) => editor.args.map(arg => arg.replaceAll('{dir}', directory))
const terminalArgs = (terminal, values) => terminal.args.map(arg => arg.replace(/\{(dir|shell|command)\}/g, (_, name) => values[name]))

module.exports = { load, save, home, expand, tilde, editors, editorArgs, terminalArgs, cleanFilters, jiraEnvFile }
