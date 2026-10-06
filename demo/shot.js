const path = require('node:path')
const os = require('node:os')
const demo = require('./fixture')

const src = path.join(__dirname, '../src')
const stub = (name, exports) => {
  const filename = require.resolve(path.join(src, name))
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const realConfig = require(path.join(src, 'config'))
stub('config', {
  ...realConfig,
  load: () => ({ ...realConfig.load(), ...demo.config })
})

stub('jira', {
  Jira: class {
    account = () => ({ email: 'you@example.com', token: 'demo' })
    boards = async () => [{ id: 1, name: 'Shop board', project: 'SHOP' }]
    optionFields = async () => [{ id: 'customfield_10000', name: 'Qualif' }]
    boardColumns = async () => demo.columns
    tickets = async () => demo.tickets
    unassigned = async () => demo.unassigned
    week = async () => demo.week
  }
})

stub('github', {
  pullRequests: async () => demo.github,
  qualifDeploys: async () => ({})
})

stub('claude', {
  live: async () => demo.live,
  past: () => demo.past,
  watch: () => () => {},
  focus: async () => false
})

stub('timer', {
  Timer: class {
    state = demo.timer
    start() {}
    stop() {}
    clear() {}
  }
})

stub('qualifs', {
  Qualifs: class {
    list = () => demo.qualifs
  }
})

stub('runs', {
  dir: os.tmpdir(),
  Runs: class {
    list = () => demo.runs
    live = () => null
    get = id => this.list().find(r => r.id === id)
    resumed() {}
    watch() {}
    terminalExited() {}
  }
})

process.env.ATELIER_SHOT ||= path.join(__dirname, 'screenshot.png')
require(path.join(src, 'main.js'))
