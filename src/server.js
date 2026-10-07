const { app } = require('electron')
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

const herdrInstalled = onPath('herdr')

const adopt = (instance, Class) => instance && Object.setPrototypeOf(instance, Class.prototype)

const freshData = () => ({
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
})

function createServer({ terminals, send, window: currentWindow, hot, shotPath }) {
  const config = configModule.load()
  const jira = new Jira(config)
  const timer = new Timer()
  const data = hot.data ||= freshData()
  const stops = []
  let stopped = false

  adopt(terminals, Terminals)
  terminals.claudeCommand = process.env.ATELIER_CLAUDE_BIN || config.claudeCommand
  terminals.editor = config.editor
  terminals.onChange = () => refreshClaude()

  let pushTimer = null
  const schedulePush = () => {
    if (!stopped && !pushTimer) pushTimer = setTimeout(() => { pushTimer = null; push() }, 150)
  }
  const qualifs = hot.qualifs = adopt(hot.qualifs, Qualifs) || new Qualifs(schedulePush, config.qualif)
  qualifs.onChange = schedulePush
  qualifs.settings = config.qualif
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
      herdr: herdrInstalled,
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
    if (!stopped) send('state', state())
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
      return github.pullRequests(config, tickets().filter(t => t.mine).map(t => t.key))
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

  function markOpenSessionSeen() {
    if (!hot.openView || !currentWindow()?.isFocused()) return false
    const terminal = terminals.get(hot.openView)
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
    window: currentWindow,
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

  async function action(name, payload = {}) {
    if (!Object.hasOwn(actions, name)) return { ok: false, error: `Unknown action ${name}` }
    try {
      const result = await actions[name](payload)
      return result && typeof result === 'object' ? { ok: true, ...result } : { ok: true, message: result }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

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

  function view(name, id) {
    hot.openView = name === 'session' ? id : null
    if (markOpenSessionSeen()) push()
    tagWindow(name === 'session')
  }

  function focused() {
    if (markOpenSessionSeen()) push()
    if (Date.now() - refreshedAt > 60000) refreshAll()
  }

  async function openFromArgs(argv) {
    const sessionId = argv.map(arg => arg.match(/^--open-session=([\w-]+)$/)?.[1]).find(Boolean)
    if (!sessionId) return
    await refreshClaude()
    const session = data.live.find(s => s.id === sessionId)
    const terminal = session && terminals.list().find(t => t.pid === session.pid && !t.exited && t.kind === 'claude')
    if (terminal) send('open-view', terminal.id)
  }

  async function screenshot() {
    const win = currentWindow()
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

  function start({ first }) {
    sapling.available().then(found => {
      data.sapling = found
      push()
    })
    if (shotPath) return
    if (first) runs.endLive()
    refreshAll()
    stops.push(claude.watch(refreshClaude), runs.watch())
    const every = (ms, task) => {
      const interval = setInterval(task, ms)
      stops.push(() => clearInterval(interval))
    }
    every(config.pollSeconds * 1000, () => {
      refreshedAt = Date.now()
      loaders.jira()
      loaders.github()
    })
    every(300000, () => loaders.time())
    every(20000, () => {
      if (Object.values(data.deploys || {}).some(d => d.status !== 'completed')) loaders.deploys()
    })
  }

  function stop() {
    stopped = true
    clearTimeout(pushTimer)
    for (const stopper of stops) stopper?.()
  }

  return { config, action, push, view, focused, openFromArgs, screenshot, start, stop }
}

module.exports = { createServer }
