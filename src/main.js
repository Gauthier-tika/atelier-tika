const { app, BrowserWindow, ipcMain, clipboard, Menu } = require('electron')
const path = require('node:path')
const configModule = require('./config')
const { Jira } = require('./jira')
const github = require('./github')
const claude = require('./claude')
const launch = require('./launch')
const wm = require('./wm')
const { Timer } = require('./timer')
const { compose, qualifPrs } = require('./compose')
const { Qualifs } = require('./qualifs')
const { run, onPath } = require('./run')
const rebase = require('./rebase')
const sapling = require('./sapling')
const { Terminals } = require('./terminals')

app.setName('atelier')
const config = configModule.load()
const THEMES = { default: '#212337', nord: '#2e3440' }
const jira = new Jira(config)
const timer = new Timer()
const shotPath = process.env.ATELIER_SHOT

const data = {
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
const qualifs = new Qualifs(() => {
  if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; push() }, 150)
})

function repos() {
  const fs = require('node:fs')
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

function repoNamed(name) {
  const repo = repos().find(r => r.name === name)
  if (!repo) throw new Error(`${name} is not a repository in ${config.devDir}`)
  return repo
}

const current = () => ({ ...compose({ ...data, qualifs: qualifs.list() }, timer.state, config, terminals.list()), repos: repos().map(r => r.name), sapling: data.sapling, editor: { name: config.editor.name, mode: config.editor.mode }, editors: editorChoices() })

const qualifBranches = () => data.github ? qualifs.list().map(q => `qualif-${data.github.viewer}-${q.number}`) : []

function push() {
  send('state', current())
}

async function load(name, task, apply) {
  data.loading[name] = true
  push()
  try {
    apply(await task())
    delete data.errors[name]
    data.updated[name] = Date.now()
  } catch (error) {
    data.errors[name] = error.message.split('\n')[0]
  } finally {
    data.loading[name] = false
    push()
  }
}

let jiraLoading = null
const loaders = {
  jira: (reconcile = []) => jiraLoading = load('jira', async () => [await jira.boardColumns(), await jira.tickets(reconcile), await jira.unassigned()], ([columns, tickets, unassigned]) => {
    data.columns = columns
    data.tickets = tickets
    data.unassigned = unassigned.filter(item => !tickets.some(t => t.key === item.key))
  }),
  github: () => load('github', async () => {
    if (!data.tickets) await jiraLoading
    return github.pullRequests(config, tickets().map(t => t.key))
  }, result => { data.github = result }).then(() => loaders.deploys()),
  deploys: () => load('deploys', () => github.qualifDeploys(config, qualifBranches()), result => { data.deploys = result }),
  time: () => load('time', () => jira.week(), result => { data.time = result })
}

async function refreshClaude() {
  data.live = await claude.live(config)
  data.past = claude.past()
  markOpenSessionSeen()
  push()
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

function refreshAll() {
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

  async claudeOpen({ key, fresh }) {
    data.past = claude.past()
    const view = current().tickets.find(t => t.key === key)
    if (!view) throw new Error(`${key} is not in your list`)
    const id = `ticket:${key}`
    const embedded = terminals.get(id)
    if (embedded && !embedded.exited && !fresh) return { view: id }
    if (view.session && !view.session.embedded && !fresh) {
      if (await claude.focus(config, view.session.id)) return 'This session runs in Ghostty, so Atelier switched to it'
      throw new Error('The Claude session is running in another terminal, but its window was not found')
    }
    if (embedded) terminals.close(id, { keepChildren: true })
    const resume = !fresh && view.previous
    terminals.spawn(id, {
      key,
      label: view.summary,
      cwd: resume ? launch.directoryFor(config, null, view.previous.cwd) : config.repoDir,
      args: resume ? ['--resume', view.previous.id] : [config.startPrompt.replaceAll('{key}', key)]
    })
    return { view: id }
  },

  async focusSession({ id }) {
    const session = data.live.find(s => s.id === id)
    const embedded = session && terminals.list().find(t => t.pid === session.pid && !t.exited)
    if (embedded) return { view: embedded.id }
    if (await claude.focus(config, id)) return 'Switched to the session in Ghostty'
    throw new Error('Its terminal window was not found')
  },

  async rebase({ key }) {
    const view = current().tickets.find(t => t.key === key)
    if (!view) throw new Error(`${key} is not in your list`)
    const pr = view.rebasable
    if (!pr) throw new Error(`${key} has no open pull request in ${path.basename(config.repoDir)}`)
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
      args: [config.reviewPrompt.replaceAll('{number}', String(pr.number))]
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


  async take({ key }) {
    const item = data.unassigned?.find(t => t.key === key)
    if (!item) throw new Error(`${key} is no longer unassigned`)
    const column = data.columns?.find(c => /progress/i.test(c.name))
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
    return `Removed qualif ${number} from Atelier. Its branch and deployment are not touched`
  },

  qualifAssign({ number, key }) {
    if (!ticket(key)) throw new Error(`${key} is not in your list`)
    qualifs.assign(number, key)
  },

  qualifUnassign({ number, key }) {
    qualifs.unassign(number, key)
  },

  async qualifSync({ number, deploy }) {
    await loaders.github()
    if (data.errors.github) throw new Error(`GitHub did not answer (${data.errors.github}), try again`)
    const rows = qualifPrs(qualifs.get(number).tickets, tickets(), data.github.mine, path.basename(config.repoDir))
    const missing = rows.filter(row => !row.prs.length && !row.merged).map(row => row.key)
    if (missing.length) throw new Error(`${missing.join(', ')} ${missing.length > 1 ? 'have' : 'has'} no open pull request in ${path.basename(config.repoDir)}. Remove ${missing.length > 1 ? 'them' : 'it'} or open the PR first`)
    const prs = rows.flatMap(row => row.prs.map(pr => ({ number: pr.number, head: pr.head, key: row.key })))
    const run = await qualifs.sync(number, {
      bin: config.qualifSyncBin,
      cwd: config.repoDir,
      prs,
      deploy: Boolean(deploy),
      tickets: rows.filter(row => row.prs.length).map(row => row.key)
    })
    if (!run.ok) throw new Error(`qualif-sync failed on qualif ${number}, see its output`)
    if (!deploy) return `Dry run done for qualif ${number}, nothing pushed`
    setTimeout(() => loaders.deploys(), 5000)
    const stale = rows.filter(row => row.prs.length && row.jiraQualif !== Number(number)).map(row => row.key)
    const refused = new Map()
    for (const key of stale) await jira.setQualif(key, Number(number)).catch(error => refused.set(key, error.message))
    if (stale.length) loaders.jira()
    const updated = stale.filter(key => !refused.has(key))
    return [
      `Pushed and started the deployment to qualif${number}`,
      updated.length ? `set Qualif ${number} in Jira on ${updated.join(', ')}` : '',
      refused.size ? `Jira refused ${[...refused].map(([key, why]) => `${key} (${why})`).join(', ')}` : ''
    ].filter(Boolean).join('; ')
  },

  async qualifCacheClear({ number }) {
    const run = await qualifs.clearCache(number, { cwd: config.repoDir, context: config.qualifKubeContext })
    if (run.ok) return `Cleared the page cache of qualif${number}`
    if (/gcloud|credentials|refresh token|reauth|Unauthorized/i.test(run.output)) throw new Error('kubectl could not sign in. Run gcloud auth login in a terminal, then try again')
    throw new Error(`Clearing the cache of qualif${number} failed, see its output`)
  },

  async log({ key, seconds }) {
    if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) throw new Error('Enter a duration between 1 minute and 24 hours')
    await jira.log(key, seconds)
    timer.clear(key)
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
    frame: false,
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

  let lastFocusRefresh = Date.now()
  win.on('focus', () => {
    if (markOpenSessionSeen()) push()
    if (Date.now() - lastFocusRefresh > 60000) {
      lastFocusRefresh = Date.now()
      refreshAll()
    }
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
  require('node:fs').writeFileSync(shotPath, image.toPNG())
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
  refreshAll()
  claude.watch(refreshClaude)
  setInterval(() => { loaders.jira(); loaders.github() }, config.pollSeconds * 1000)
  setInterval(() => loaders.time(), 300000)
  setInterval(() => {
    if (Object.values(data.deploys || {}).some(d => d.status !== 'completed')) loaders.deploys()
  }, 20000)
})

app.on('window-all-closed', () => app.quit())
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault())
})
