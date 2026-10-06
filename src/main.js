const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const configModule = require('./config')
const { Jira } = require('./jira')
const github = require('./github')
const claude = require('./claude')
const launch = require('./launch')
const wm = require('./wm')
const { Timer } = require('./timer')
const { compose, qualifPrs, deploysPrBranch, deployTarget, syncedBranch, inProgressStation } = require('./compose')
const { Qualifs } = require('./qualifs')
const { run, onPath, env } = require('./run')
const rebase = require('./rebase')
const sapling = require('./sapling')
const { Terminals } = require('./terminals')
const { Runs, dir: runsDir } = require('./runs')

app.setName('atelier')
const config = configModule.load()
const THEMES = {
  default: '#212337',
  nord: '#2e3440',
  light: '#f4f5f9',
  latte: '#eff1f5',
  frappe: '#303446',
  macchiato: '#24273a',
  mocha: '#1e1e2e',
  dracula: '#282a36'
}
const jira = new Jira(config)
const timer = new Timer()
const shotPath = process.env.ATELIER_SHOT

const data = {
  boards: null,
  jiraFields: null,
  columns: null,
  tickets: null,
  unassigned: null,
  github: null,
  deploys: null,
  sapling: null,
  live: [],
  past: [],
  time: null,
  errors: {},
  loading: { jira: true, github: true, time: true },
  updated: {}
}

let win = null
let quitting = false

const send = (channel, ...args) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}
const terminals = new Terminals(send, process.env.ATELIER_CLAUDE_BIN || config.claudeCommand, config.editor)
terminals.onChange = () => refreshClaude()

let pushTimer = null
const schedulePush = () => {
  if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; push() }, 150)
}
const qualifs = new Qualifs(schedulePush, config.qualif)
const runs = new Runs(schedulePush)
terminals.onExit = item => { if (item.runId) runs.terminalExited(item.id) }

function listRepos() {
  const devDir = config.devDir
  const dirs = config.repos?.length ? config.repos.map(configModule.expand) : (() => {
    try {
      return fs.readdirSync(devDir).map(name => path.join(devDir, name))
        .filter(dir => fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, '.sl')))
    } catch {
      return []
    }
  })()
  const list = dirs.map(dir => ({ name: path.basename(dir), dir }))
  return list.sort((a, b) => (b.dir === config.repoDir) - (a.dir === config.repoDir) || a.name.localeCompare(b.name))
}

let repoList = null
const repos = () => repoList ||= listRepos()

function repoNamed(name) {
  const repo = repos().find(r => r.name === name)
  if (!repo) throw new Error(`${name} is not a repository in ${config.devDir}`)
  return repo
}

function jiraSettings() {
  const account = jira.account()
  return {
    base: config.jiraBase || '',
    email: account?.email || '',
    connected: Boolean(config.jiraBase && account),
    file: configModule.tilde(config.jiraEnvLegacy ? configModule.jiraEnvFile : config.jiraEnv),
    legacyFile: config.jiraEnvLegacy ? configModule.tilde(config.jiraEnv) : null,
    boards: data.boards,
    boardId: config.boardId || (data.boards?.length === 1 ? data.boards[0].id : null),
    columns: (data.columns || []).map(({ id, name }) => ({ id, name })),
    unassignedColumns: config.unassignedColumns,
    mineColumns: config.mineColumns,
    filters: config.filters
  }
}

const QUALIF_TEXT = ['label', 'url', 'branch', 'base', 'repo', 'workflow', 'jiraField']

function qualifSettings() {
  const settings = config.qualifSettings || configModule.cleanQualif({})
  return {
    enabled: Boolean(config.qualif),
    values: { ...settings, inputs: Object.entries(settings.inputs).map(([key, value]) => `${key}=${value}`).join('\n') },
    defaultRepo: config.githubRepo,
    cache: settings.cache?.commands.map(command => command.join(' ')) || [],
    fields: data.jiraFields
  }
}

function parseInputs(text) {
  const inputs = {}
  for (const line of String(text || '').split('\n').map(l => l.trim()).filter(Boolean)) {
    const match = line.match(/^([\w-]+)\s*=\s*(.*)$/)
    if (!match) throw new Error(`Write each workflow input as name=value, not "${line}"`)
    inputs[match[1]] = match[2]
  }
  return inputs
}

function state() {
  return {
    ...compose({ ...data, qualifs: qualifs.list(), runs: runs.list() }, timer.state, config, terminals.list()),
    workflows: config.workflows.map(({ id, label, description }) => ({ id, label, description: description || '' })),
    repos: repos().map(r => r.name),
    sapling: data.sapling,
    editor: { name: config.editor.name, mode: config.editor.mode },
    editors: editorChoices(),
    terminal: { name: config.terminal.name, switching: Boolean(wm.desktop) },
    devDir: configModule.tilde(config.devDir),
    reposPinned: Boolean(config.repos?.length),
    jira: jiraSettings(),
    qualifSettings: qualifSettings()
  }
}

function ticketView(key) {
  const view = state().tickets.find(t => t.key === key)
  if (!view) throw new Error(`${key} is not in your list`)
  return view
}

const qualifBranches = () => data.github ? [...new Set(qualifs.list().map(q => syncedBranch(config.qualif, data.github.viewer, q)).filter(Boolean))] : []

function push() {
  clearTimeout(pushTimer)
  pushTimer = null
  send('state', state())
}

const inFlight = {}

function load(name, task, apply) {
  const running = inFlight[name]
  if (running) return running.again ||= running.done.then(() => load(name, task, apply))
  const entry = {}
  inFlight[name] = entry
  data.loading[name] = true
  schedulePush()
  entry.done = (async () => {
    try {
      apply(await task())
      delete data.errors[name]
      data.updated[name] = Date.now()
    } catch (error) {
      data.errors[name] = error.message.split('\n')[0]
    } finally {
      delete inFlight[name]
      data.loading[name] = false
      schedulePush()
    }
  })()
  return entry.done
}

const reconcile = new Set()
const loaders = {
  jira: (ids = []) => {
    ids.forEach(id => reconcile.add(id))
    return load('jira', async () => {
      const ids = [...reconcile]
      reconcile.clear()
      return [await jira.boards(), await jira.boardColumns(), await jira.tickets(ids), await jira.unassigned(), await jira.optionFields().catch(() => null)]
    }, ([boards, columns, tickets, unassigned, fields]) => {
      data.boards = boards
      data.jiraFields = fields
      data.columns = columns
      data.tickets = tickets
      data.unassigned = unassigned.filter(item => !tickets.some(t => t.key === item.key))
    })
  },
  github: () => load('github', async () => {
    if (!data.tickets) await inFlight.jira?.done
    return github.pullRequests(config, tickets().map(t => t.key))
  }, result => { data.github = result }).then(() => loaders.deploys()),
  deploys: () => load('deploys', () => github.qualifDeploys(config, qualifBranches()), result => { data.deploys = result }),
  time: () => load('time', () => jira.week(), result => { data.time = result })
}

async function refreshClaude() {
  data.live = await claude.live(config)
  data.past = claude.past()
  markOpenSessionSeen()
  schedulePush()
}

let openView = null

function markOpenSessionSeen() {
  if (!openView || !win?.isFocused()) return false
  const terminal = terminals.get(openView)
  const session = terminal && !terminal.exited && data.live.find(s => s.pid === terminal.pid && s.status === 'done' && !s.seen)
  if (!session) return false
  session.seen = true
  claude.markSeen(config, session.id)
  return true
}

let refreshedAt = 0

function refreshAll() {
  repoList = null
  refreshedAt = Date.now()
  return Promise.all([loaders.jira(), loaders.github(), loaders.time(), refreshClaude()])
}

function refreshBar() {
  run('qs', ['ipc', '-c', 'desktop', 'call', 'desktop', 'refresh'], { timeout: 5000 }).catch(() => {})
}

const tickets = () => data.tickets || []

const editorWindow = () => config.editor.mode === 'window'

const installed = new Map()
function editorChoices() {
  const known = configModule.editors.some(e => e.command === config.editor.command)
  return [...configModule.editors, ...(known ? [] : [{ ...config.editor, custom: true }])].map(({ name, command, mode, custom = false }) => {
    if (!installed.has(command)) installed.set(command, onPath(command))
    return { name, command, mode, custom, found: installed.get(command), current: command === config.editor.command }
  })
}

function openEditorView(id, cwd, label) {
  const existing = terminals.get(id)
  if (existing?.exited) terminals.close(id)
  terminals.spawn(id, { label, cwd, kind: 'terminal', command: config.editor.command, args: configModule.editorArgs(config.editor, cwd) })
  return id
}
const ticket = key => tickets().find(t => t.key === key)

function spawnRun(run, args) {
  const cwd = [run.cwd, config.workflows.find(w => w.id === run.workflow)?.cwd, config.repoDir].find(dir => dir && fs.existsSync(dir))
  terminals.spawn(run.terminal, {
    runId: run.id,
    label: run.label,
    cwd,
    args,
    env: {
      ATELIER_RUN_ID: run.id,
      ATELIER_RUNS_DIR: runsDir,
      PATH: `${path.join(__dirname, '..', 'bin')}:${env.PATH}`
    }
  })
}

const actions = {
  refresh: () => refreshAll(),

  openUrl: ({ url }) => launch.openUrl(url),

  setTheme({ theme }) {
    if (!Object.hasOwn(THEMES, theme)) throw new Error(`Unknown theme ${theme}`)
    config.theme = theme === 'default' ? null : theme
    configModule.save({ theme: config.theme })
    win.setBackgroundColor(THEMES[theme])
  },

  setEditor({ command }) {
    const editor = configModule.editors.find(e => e.command === command)
    if (!editor) throw new Error(`Unknown editor ${command}`)
    configModule.save({ editor: editor === configModule.editors[0] ? null : editor })
    config.editor = { ...editor }
    terminals.editor = config.editor
    push()
  },

  async jiraConnect({ base, email, token }) {
    let site = String(base || '').trim().replace(/\/+$/, '')
    if (site && !/^https?:\/\//.test(site)) site = `https://${site}`
    let origin
    try {
      origin = new URL(site).origin
    } catch {
      throw new Error('Enter the Jira site, such as https://your-team.atlassian.net')
    }
    email = String(email || '').trim()
    const saved = jira.account()
    token = String(token || '').trim() || (saved?.email === email ? saved.token : '')
    if (!email) throw new Error('Enter the e-mail of your Atlassian account')
    if (!token) throw new Error('Enter an API token for that account')
    const me = await jira.myself(origin, { email, token })
    const file = config.jiraEnvLegacy ? configModule.jiraEnvFile : config.jiraEnv
    jira.saveAccount(file, { base: origin, email, token })
    config.jiraEnv = file
    config.jiraEnvLegacy = false
    const siteChanged = config.jiraBase !== origin
    config.jiraBase = origin
    if (siteChanged) config.boardId = null
    configModule.save({ jiraBase: origin, ...(siteChanged ? { boardId: null } : {}) })
    jira.reset()
    Object.assign(data, siteChanged ? { boards: null, columns: null, tickets: null, unassigned: null } : {})
    loaders.jira()
    loaders.time()
    return `Connected to ${new URL(origin).host} as ${me.displayName || email}`
  },

  jiraBoard({ id }) {
    const board = data.boards?.find(b => b.id === Number(id))
    if (!board) throw new Error('That board is no longer listed')
    config.boardId = board.id
    configModule.save({ boardId: board.id })
    jira.columns = null
    data.columns = null
    data.unassigned = null
    loaders.jira()
    return `Atelier now sorts your tickets by the columns of ${board.name}`
  },

  jiraUnassigned({ columns }) {
    config.unassignedColumns = (Array.isArray(columns) ? columns : []).filter(c => typeof c === 'string')
    configModule.save({ unassignedColumns: config.unassignedColumns })
    loaders.jira()
  },

  jiraMine({ columns }) {
    config.mineColumns = Array.isArray(columns) ? columns.filter(c => typeof c === 'string') : null
    configModule.save({ mineColumns: config.mineColumns })
    push()
  },

  jiraFilters({ filters }) {
    if (!Array.isArray(filters) || filters.some(f => !String(f?.label || '').trim())) throw new Error('Give every filter a name')
    config.filters = configModule.cleanFilters(filters)
    configModule.save({ filters: config.filters })
    push()
  },

  qualifSetting({ field, value }) {
    const raw = { ...(configModule.readUser().qualif || {}) }
    if (field === 'enabled') {
      if (value) delete raw.enabled
      else raw.enabled = false
    } else if (field === 'count') {
      const count = Number(value)
      if (!Number.isInteger(count) || count < 1 || count > 99) throw new Error('The number of qualifs goes from 1 to 99')
      raw.count = count
    } else if (field === 'inputs') {
      const inputs = parseInputs(value)
      if (Object.keys(inputs).length) raw.inputs = inputs
      else delete raw.inputs
    } else if (QUALIF_TEXT.includes(field)) {
      const text = String(value ?? '').trim()
      if (text) raw[field] = text
      else delete raw[field]
    } else throw new Error(`Unknown qualif setting ${field}`)
    configModule.save({ qualif: raw })
    config.qualifSettings = configModule.cleanQualif(raw)
    config.qualif = raw.enabled === false ? null : config.qualifSettings
    qualifs.settings = config.qualif
    if (['enabled', 'jiraField'].includes(field)) {
      jira.qualifOptions = null
      loaders.jira()
    }
    if (['enabled', 'branch', 'repo', 'workflow'].includes(field)) {
      data.deploys = null
      loaders.deploys()
    }
    push()
  },

  async chooseDevDir() {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Folder that holds your repositories',
      defaultPath: config.devDir,
      properties: ['openDirectory']
    })
    if (canceled || !filePaths.length) return
    config.devDir = filePaths[0]
    repoList = null
    const shown = configModule.tilde(config.devDir)
    configModule.save({ devDir: shown })
    push()
    const count = repos().length
    return count ? `Found ${count} ${count === 1 ? 'repository' : 'repositories'} in ${shown}` : `No repository in ${shown}`
  },

  async claudeOpen({ key, fresh }) {
    data.past = claude.past()
    const view = ticketView(key)
    const id = `ticket:${key}`
    const embedded = terminals.get(id)
    if (embedded && !embedded.exited && !fresh) return { view: id }
    if (view.session && !view.session.embedded && !fresh) {
      if (!wm.desktop) throw new Error(`This session runs in ${config.terminal.name}, and Atelier cannot switch windows on this desktop`)
      if (await claude.focus(config, view.session.id)) return `This session runs in ${config.terminal.name}, so Atelier switched to it`
      throw new Error('The Claude session is running in another terminal, but its window was not found')
    }
    if (embedded) terminals.close(id, { keepChildren: true })
    const resume = !fresh && view.previous
    terminals.spawn(id, {
      key,
      label: view.summary,
      cwd: resume ? launch.directoryFor(config, null, view.previous.cwd) : config.repoDir,
      args: resume ? ['--resume', view.previous.id] : [configModule.fill(config.startPrompt, { key })]
    })
    return { view: id }
  },

  async focusSession({ id }) {
    const session = data.live.find(s => s.id === id)
    const embedded = session && terminals.list().find(t => t.pid === session.pid && !t.exited)
    if (embedded) return { view: embedded.id }
    if (!wm.desktop) throw new Error(`This session runs in ${config.terminal.name}, and Atelier cannot switch windows on this desktop`)
    if (await claude.focus(config, id)) return `Switched to the session in ${config.terminal.name}`
    throw new Error('Its terminal window was not found')
  },

  async rebase({ key }) {
    const view = ticketView(key)
    const pr = view.rebasable
    if (!pr) throw new Error(`${key} has no open pull request in ${config.repoName}`)
    const id = `rebase:${key}`
    const embedded = terminals.get(id)
    if (embedded && !embedded.exited) return { view: id }
    if (embedded) terminals.close(id)
    const spawnClaude = context => terminals.spawn(id, {
      key,
      label: `Rebase of #${pr.number} onto ${pr.base}`,
      cwd: context.dir,
      args: [rebase.prompt(key, pr, context, { withSapling: data.sapling, repoDir: config.repoDir })]
    })
    const waiting = await rebase.resume(pr)
    if (waiting) {
      spawnClaude(waiting)
      return { view: id, message: `The rebase of #${pr.number} was still waiting on conflicts, Claude picks it up` }
    }
    const result = await rebase.start(config.repoDir, pr)
    if (result.status === 'current') return `#${pr.number} already sits on top of origin/${pr.base}`
    if (result.status === 'pushed') {
      loaders.github()
      return `Rebased #${pr.number} onto origin/${pr.base} and force-pushed it. ${data.sapling ? 'Your local Sapling commit' : `Your local ${pr.branch} branch, if you have one,`} is now the old version`
    }
    spawnClaude(result)
    return { view: id, message: `#${pr.number} conflicts with origin/${pr.base} in ${result.files.length} file${result.files.length > 1 ? 's' : ''}, Claude resolves it` }
  },

  reviewWithClaude({ id }) {
    const pr = data.github?.reviews.find(p => p.id === id) || data.github?.mine.find(p => p.id === id)
    if (!pr) throw new Error('That pull request is no longer listed')
    const termId = `review:${pr.id}`
    const embedded = terminals.get(termId)
    if (embedded && !embedded.exited) return { view: termId }
    if (embedded) terminals.close(termId)
    terminals.spawn(termId, {
      prId: pr.id,
      label: `Review of ${pr.repo}#${pr.number}: ${pr.title}`,
      cwd: launch.directoryFor(config, pr.repo),
      args: [configModule.fill(config.reviewPrompt, { number: pr.number })]
    })
    return { view: termId }
  },

  claudeRepo({ name }) {
    const repo = repoNamed(name)
    let n = 1
    while (terminals.get(`repo:${repo.name}:${n}`)) n++
    const id = `repo:${repo.name}:${n}`
    terminals.spawn(id, { label: `Claude in ${repo.name}`, cwd: repo.dir })
    return { view: id }
  },

  shellRepo({ name }) {
    const repo = repoNamed(name)
    let n = 1
    while (terminals.get(`term:${repo.name}:${n}`)) n++
    const id = `term:${repo.name}:${n}`
    terminals.spawn(id, { label: `Terminal in ${repo.name}`, cwd: repo.dir, kind: 'terminal' })
    return { view: id }
  },

  async slWeb({ name }) {
    if (!(await sapling.available())) throw new Error('Sapling is not installed, so sl web is not available')
    const repo = repoNamed(name)
    const server = JSON.parse(await run('sl', ['web', '--no-open', '--json'], { cwd: repo.dir, timeout: 30000 }))
    const url = new URL(server.url)
    if (url.protocol !== 'http:' || url.hostname !== 'localhost') throw new Error(`Sapling Web answered on ${url.origin}, not on localhost`)
    return { web: { url: server.url, repo: repo.name } }
  },

  editorRepo({ name }) {
    const repo = repoNamed(name)
    if (editorWindow()) return launch.editorWindow(config.editor, repo.dir)
    return { view: openEditorView(`editor:${repo.name}`, repo.dir, `${config.editor.name} in ${repo.name}`) }
  },


  workflowRun({ id }) {
    const workflow = config.workflows.find(w => w.id === id)
    if (!workflow) throw new Error(`No workflow ${id} in config.json`)
    const live = runs.live(workflow.id)
    if (live) return { view: live.terminal, message: `${workflow.label} is already running` }
    const run = runs.create(workflow)
    spawnRun(run, ['--session-id', run.session, workflow.prompt])
    return { view: run.terminal }
  },

  runResume({ id }) {
    const run = runs.get(id)
    if (!run.session) throw new Error('This run started before Atelier recorded its Claude session')
    const terminal = terminals.get(run.terminal)
    if (terminal && !terminal.exited) return { view: run.terminal }
    if (terminal) terminals.close(run.terminal, { keepChildren: true })
    runs.resumed(run.id)
    spawnRun(run, ['--resume', run.session])
    return { view: run.terminal }
  },

  runAnswer({ id, option }) {
    const run = runs.get(id)
    if (!run.question?.options.includes(option)) throw new Error('That question was already answered')
    const terminal = terminals.get(run.terminal)
    if (!terminal || terminal.exited) throw new Error('The run session has ended')
    runs.answered(id, run.question.asked)
    terminals.write(run.terminal, option)
    setTimeout(() => terminals.write(run.terminal, '\r'), 150)
    return `Answered "${option}"`
  },

  runDismiss({ id }) {
    const run = runs.get(id)
    if (terminals.get(run.terminal)?.exited) terminals.close(run.terminal)
    runs.dismiss(id)
  },

  async take({ key }) {
    const item = data.unassigned?.find(t => t.key === key)
    if (!item) throw new Error(`${key} is no longer unassigned`)
    const column = data.columns?.[inProgressStation(data.columns)]
    if (!column) throw new Error('The board has no In progress column')
    await jira.assignToMe(key)
    let status
    try {
      status = await jira.moveTo(key, column.statusIds)
    } catch (error) {
      await loaders.jira([item.id])
      throw new Error(`Assigned ${key} to you, but could not move it: ${error.message}`)
    }
    await loaders.jira([item.id])
    return `Assigned ${key} to you and moved it to ${status}`
  },

  closeTerminal({ id }) {
    terminals.close(id)
    push()
  },

  splitShell({ parent }) {
    return { pane: terminals.spawnShell(parent).id }
  },

  openEditor({ parent }) {
    if (!editorWindow()) return { pane: terminals.spawnEditor(parent).id }
    const owner = terminals.get(parent)
    if (!owner) throw new Error('That session is gone')
    return launch.editorWindow(config.editor, owner.cwd)
  },

  async move({ key, station }) {
    const column = data.columns?.[station]
    if (!column || !ticket(key)) throw new Error('Unknown ticket or column')
    const status = await jira.moveTo(key, column.statusIds)
    await loaders.jira([ticket(key).id])
    return `Moved ${key} to ${status}`
  },

  async flag({ key, blocked }) {
    await jira.setBlocked(key, blocked)
    const item = ticket(key)
    if (item) item.blocked = blocked
    push()
    loaders.jira(item ? [item.id] : [])
    return blocked ? `Flagged ${key} as blocked` : `Removed the blocked flag from ${key}`
  },

  timerStart({ key }) {
    timer.start(key)
    push()
  },

  timerStop() {
    timer.stop()
    push()
  },

  timerDiscard({ key }) {
    timer.clear(key)
    push()
    return `Discarded the unlogged time on ${key}`
  },

  qualifAdd({ number }) {
    qualifs.add(number)
    loaders.deploys()
  },

  qualifRemove({ number }) {
    qualifs.remove(number)
    return `Removed ${config.qualif.label} ${number} from Atelier. Its branch and deployment are not touched`
  },

  qualifAssign({ number, key }) {
    if (!ticket(key)) throw new Error(`${key} is not in your list`)
    qualifs.assign(number, key)
  },

  qualifUnassign({ number, key }) {
    qualifs.unassign(number, key)
  },

  async qualifSync({ number, deploy }) {
    const settings = config.qualif
    const name = `${settings?.label} ${number}`
    qualifs.get(number)
    await loaders.github()
    if (data.errors.github) throw new Error(`GitHub did not answer (${data.errors.github}), try again`)
    const rows = qualifPrs(qualifs.get(number).tickets, tickets(), data.github.mine, config.repoName)
    const missing = rows.filter(row => !row.prs.length && !row.merged).map(row => row.key)
    if (missing.length) throw new Error(`${missing.join(', ')} ${missing.length > 1 ? 'have' : 'has'} no open pull request in ${config.repoName}. Remove ${missing.length > 1 ? 'them' : 'it'} or open the PR first`)
    const prs = rows.flatMap(row => row.prs.map(pr => ({ number: pr.number, head: pr.head, branch: pr.branch, key: row.key })))
    const target = deployTarget(settings, data.github.viewer, Number(number), prs)
    if (deploy && !settings.workflow) throw new Error(`No deploy workflow is set up for ${settings.label.toLowerCase()}s in config.json`)
    const args = [
      String(number), ...prs.map(pr => String(pr.number)),
      '--base', settings.base, '--branch', settings.branch, '--max', String(settings.count),
      ...(settings.workflow ? ['--workflow', settings.workflow, ...Object.entries(settings.inputs).flatMap(([key, value]) => ['-f', `${key}=${value}`])] : []),
      deploy ? '--deploy' : '--dry-run'
    ]
    const run = await qualifs.sync(number, {
      bin: config.qualifSyncBin,
      cwd: config.repoDir,
      args,
      prs,
      branch: target,
      deploy: Boolean(deploy),
      tickets: rows.filter(row => row.prs.length).map(row => row.key)
    })
    if (!run.ok) throw new Error(`qualif-sync failed on ${name}, see its output`)
    if (!deploy) return `Dry run done for ${name}, nothing pushed or deployed`
    setTimeout(() => loaders.deploys(), 5000)
    const stale = settings.jiraField ? rows.filter(row => row.prs.length && row.jiraQualif !== Number(number)).map(row => row.key) : []
    const refused = new Map()
    for (const key of stale) await jira.setQualif(key, Number(number)).catch(error => refused.set(key, error.message))
    if (stale.length) loaders.jira()
    const updated = stale.filter(key => !refused.has(key))
    return [
      deploysPrBranch(settings, prs) ? `Started the deployment of ${target} to ${name}` : `Pushed ${target} and started the deployment to ${name}`,
      updated.length ? `set ${name} in Jira on ${updated.join(', ')}` : '',
      refused.size ? `Jira refused ${[...refused].map(([key, why]) => `${key} (${why})`).join(', ')}` : ''
    ].filter(Boolean).join('; ')
  },

  async qualifCacheClear({ number }) {
    const name = `${config.qualif?.label} ${number}`
    const run = await qualifs.clearCache(number, { cwd: config.repoDir })
    if (run.ok) return `Cleared the cache of ${name}`
    if (/gcloud/i.test(run.output) && /credentials|refresh token|reauth|Unauthorized/i.test(run.output)) throw new Error('gcloud could not sign in. Run gcloud auth login in a terminal, then try again')
    throw new Error(`Clearing the cache of ${name} failed, see its output`)
  },

  async logDelete({ key, id }) {
    if (!/^\d+$/.test(String(id))) throw new Error('Unknown time entry')
    await jira.deleteLog(key, id)
    refreshBar()
    loaders.time()
    loaders.jira()
    return `Deleted a time entry on ${key}`
  },

  async logUpdate({ key, id, seconds }) {
    if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) throw new Error('Enter a duration between 1 minute and 24 hours')
    if (!/^\d+$/.test(String(id))) throw new Error('Unknown time entry')
    await jira.updateLog(key, id, seconds)
    refreshBar()
    loaders.time()
    loaders.jira()
    return `Changed the time on ${key}`
  },

  async log({ key, seconds, date }) {
    if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) throw new Error('Enter a duration between 1 minute and 24 hours')
    if (date) {
      const parsed = new Date(`${date}T12:00:00`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())) throw new Error('Pick a valid day')
      if (date > new Date().toLocaleDateString('sv')) throw new Error('Pick today or an earlier day')
    }
    await jira.log(key, seconds, date)
    // A manual entry leaves the timer's unlogged time alone
    if (!date) timer.clear(key)
    push()
    refreshBar()
    loaders.time()
    loaders.jira()
    const h = Math.floor(seconds / 3600)
    const m = Math.round((seconds % 3600) / 60)
    return `Logged ${h ? `${h}h` : ''}${String(m).padStart(h ? 2 : 1, '0')}${h ? '' : 'm'} on ${key}`
  }
}

ipcMain.handle('action', async (_event, name, payload = {}) => {
  if (!Object.hasOwn(actions, name)) return { ok: false, error: `Unknown action ${name}` }
  try {
    const result = await actions[name](payload)
    return result && typeof result === 'object' ? { ok: true, ...result } : { ok: true, message: result }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

ipcMain.on('ready', () => push())
ipcMain.on('term-input', (_event, id, input) => terminals.write(id, input))
ipcMain.on('term-resize', (_event, id, cols, rows) => terminals.resize(id, cols, rows))
ipcMain.on('term-size', (_event, cols, rows) => terminals.setSize(cols, rows))
ipcMain.handle('term-replay', (_event, id) => {
  terminals.flush()
  return terminals.replay(id)
})
ipcMain.on('view', (_event, view, id) => {
  openView = view === 'session' ? id : null
  if (markOpenSessionSeen()) push()
  tagWindow(view === 'session')
})
ipcMain.on('quit', () => {
  quitting = true
  terminals.killAll()
  win?.close()
})
ipcMain.handle('clipboard-read', () => clipboard.readText())
ipcMain.handle('clipboard-write', (_event, text) => clipboard.writeText(String(text)))

let tagged = null
async function tagWindow(asTerminal) {
  if (shotPath || tagged === asTerminal) return
  tagged = asTerminal
  try {
    const own = (await wm.clients()).find(c => c.pid === process.pid)
    if (!own) return
    await wm.tag(own.address, asTerminal)
  } catch {
    tagged = null
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: Number(process.env.ATELIER_WIDTH) || 1500,
    height: Number(process.env.ATELIER_HEIGHT) || 960,
    minWidth: 520,
    minHeight: 420,
    show: !shotPath,
    frame: !wm.desktop,
    backgroundColor: THEMES[config.theme] || THEMES.default,
    title: 'Atelier',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      offscreen: Boolean(shotPath)
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    launch.openUrl(url).catch(() => {})
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', event => event.preventDefault())
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && !input.alt && input.code === 'KeyR') {
      event.preventDefault()
      win.webContents.reloadIgnoringCache()
    }
  })
  win.on('close', event => {
    if (quitting || win.webContents.isCrashed()) return terminals.killAll()
    const running = terminals.running()
    if (!running.length) return
    event.preventDefault()
    send('confirm-quit', running.length)
  })
  win.loadFile(path.join(__dirname, 'renderer/index.html'), { query: config.theme ? { theme: config.theme } : {} })

  win.on('focus', () => {
    if (markOpenSessionSeen()) push()
    if (Date.now() - refreshedAt > 60000) refreshAll()
  })
}

async function screenshot() {
  await refreshAll()
  await new Promise(resolve => setTimeout(resolve, 1500))
  const tab = process.env.ATELIER_SHOT_TAB
  if (tab) {
    await win.webContents.executeJavaScript(`setTab(${JSON.stringify(tab)})`)
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  const key = process.env.ATELIER_SHOT_SESSION
  if (key) {
    const result = key.startsWith('repo:') ? await actions.claudeRepo({ name: key.slice(5) })
      : key.startsWith('term:') ? actions.shellRepo({ name: key.slice(5) })
      : await actions.claudeOpen({ key, fresh: true })
    await new Promise(resolve => setTimeout(resolve, 600))
    await win.webContents.executeJavaScript(`openSession(${JSON.stringify(result.view)})`)
    await new Promise(resolve => setTimeout(resolve, 800))
    if (!result.view.startsWith('ticket:')) await win.webContents.executeJavaScript(`split(${JSON.stringify(result.view)}, 'row')`)
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  const image = await win.webContents.capturePage()
  fs.writeFileSync(shotPath, image.toPNG())
  terminals.killAll()
  app.exit(0)
}

if (!shotPath && !app.requestSingleInstanceLock()) app.exit(0)

async function openFromArgs(argv) {
  const sessionId = argv.map(arg => arg.match(/^--open-session=([\w-]+)$/)?.[1]).find(Boolean)
  if (!sessionId) return
  await refreshClaude()
  const session = data.live.find(s => s.id === sessionId)
  const terminal = session && terminals.list().find(t => t.pid === session.pid && !t.exited && t.kind === 'claude')
  if (terminal) send('open-view', terminal.id)
}

app.on('second-instance', (_event, argv) => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  openFromArgs(argv)
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  sapling.available().then(found => {
    data.sapling = found
    push()
  })
  createWindow()
  if (shotPath) {
    win.webContents.once('did-finish-load', screenshot)
    return
  }
  runs.endLive()
  refreshAll()
  claude.watch(refreshClaude)
  runs.watch()
  setInterval(() => {
    refreshedAt = Date.now()
    loaders.jira()
    loaders.github()
  }, config.pollSeconds * 1000)
  setInterval(() => loaders.time(), 300000)
  setInterval(() => {
    if (Object.values(data.deploys || {}).some(d => d.status !== 'completed')) loaders.deploys()
  }, 20000)
})

app.on('window-all-closed', () => app.quit())
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault())
})
