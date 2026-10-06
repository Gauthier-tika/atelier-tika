const { app, BrowserWindow, ipcMain, clipboard, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const configModule = require('./config')
const { Jira } = require('./jira')
const github = require('./github')
const claude = require('./claude')
const launch = require('./launch')
const wm = require('./wm')
const { Timer } = require('./timer')
const { compose, syncedBranch } = require('./compose')
const { Qualifs } = require('./qualifs')
const { onPath } = require('./run')
const sapling = require('./sapling')
const { Terminals } = require('./terminals')
const { Runs } = require('./runs')
const { themeNamed } = require('./themes')

app.setName('atelier')
const config = configModule.load()
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
qualifs.onOutput = (number, chunk) => send('qualif-output', number, chunk)
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

function qualifSettings() {
  const settings = config.qualifSettings || configModule.cleanQualif({})
  return {
    enabled: Boolean(config.qualif),
    max: configModule.QUALIF_MAX,
    values: { ...settings, inputs: Object.entries(settings.inputs).map(([key, value]) => `${key}=${value}`).join('\n') },
    defaultRepo: config.githubRepo,
    cache: settings.cache?.commands.map(command => command.join(' ')) || [],
    fields: data.jiraFields
  }
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
      const boards = await jira.boards()
      const columns = await jira.boardColumns()
      return [boards, columns, ...await Promise.all([jira.tickets(ids), jira.unassigned(), jira.optionFields().catch(() => null)])]
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

let pastAt = 0

async function refreshClaude() {
  data.live = await claude.live(config)
  if (Date.now() - pastAt > 30000 || data.live.some(session => !data.past.some(p => p.id === session.id))) {
    data.past = claude.past()
    pastAt = Date.now()
  }
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

const tickets = () => data.tickets || []

const installed = new Map()
function editorChoices() {
  const known = configModule.editors.some(e => e.command === config.editor.command)
  return [...configModule.editors, ...(known ? [] : [{ ...config.editor, custom: true }])].map(({ name, command, mode, custom = false }) => {
    if (!installed.has(command)) installed.set(command, onPath(command))
    return { name, command, mode, custom, found: installed.get(command), current: command === config.editor.command }
  })
}

const ctx = {
  config,
  data,
  jira,
  timer,
  qualifs,
  runs,
  terminals,
  loaders,
  push,
  window: () => win,
  repos,
  resetRepos: () => { repoList = null },
  tickets,
  ticketView
}

const actions = {
  refresh: () => refreshAll(),
  openUrl: ({ url }) => launch.openUrl(url),
  ...require('./actions/settings')(ctx),
  ...require('./actions/sessions')(ctx),
  ...require('./actions/runs')(ctx),
  ...require('./actions/tickets')(ctx),
  ...require('./actions/qualifs')(ctx)
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
    backgroundColor: themeNamed(config.theme).terminal.background,
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
    if (terminals.get(result.view).role !== 'ticket') await win.webContents.executeJavaScript(`split(${JSON.stringify(result.view)}, 'row')`)
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
