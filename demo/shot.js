const path = require('node:path')
const os = require('node:os')

const src = path.join(__dirname, '../src')
const stub = (name, exports) => {
  const filename = require.resolve(path.join(src, name))
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const now = Date.now()
const hours = n => n * 3600
const ago = ms => new Date(now - ms).toISOString()
const MIN = 60000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const realConfig = require(path.join(src, 'config'))
stub('config', {
  ...realConfig,
  load: () => ({
    ...realConfig.load(),
    jiraBase: 'https://example.atlassian.net',
    githubOrg: 'acme',
    repoDir: path.join(os.homedir(), 'Dev/shop'),
    repos: ['~/Dev/shop', '~/Dev/atelier', '~/Dev/infra'],
    reviewRepos: ['shop'],
    workflows: [{ id: 'autopilot', label: 'Solve the next ticket', prompt: '/ticket-autopilot', cwd: path.join(os.homedir(), 'Dev/shop') }]
  })
})

const columns = [
  { id: 'To Do', name: 'To Do', statusIds: ['1'] },
  { id: 'In Progress / PR', name: 'In progress', statusIds: ['3'] },
  { id: 'Code review', name: 'Code review', statusIds: ['4'] },
  { id: 'RECETTE PO', name: 'Recette PO', statusIds: ['5'] },
  { id: 'A MEPP', name: 'À MEPP', statusIds: ['6'] },
  { id: 'A MEP', name: 'À MEP', statusIds: ['7'] }
]
const status = id => ({ id, name: columns.find(c => c.statusIds.includes(id)).name, category: 'indeterminate' })
const ticket = (key, summary, statusId, extra = {}) => ({
  key,
  summary,
  url: `https://example.atlassian.net/browse/${key}`,
  type: 'Story',
  priority: 'Medium',
  status: status(statusId),
  epic: null,
  blocked: false,
  qualif: null,
  timeSpent: 0,
  updated: ago(extra.age || HOUR),
  ...extra
})

const tickets = [
  ticket('SHOP-482', 'Show delivery dates on the product page', '3', { timeSpent: hours(5.5), age: 10 * MIN }),
  ticket('SHOP-477', 'Let customers save a cart and share it by link', '3', { timeSpent: hours(3), age: 40 * MIN }),
  ticket('SHOP-469', 'Filter the catalogue by material and finish', '4', { timeSpent: hours(7.25), age: 3 * HOUR, qualif: 4 }),
  ticket('SHOP-455', 'Fix the coupon field losing focus on mobile', '5', { type: 'Bug', timeSpent: hours(2), age: DAY }),
  ticket('SHOP-490', 'Add a size guide to the sofa pages', '1', { age: 2 * HOUR }),
  ticket('SHOP-461', 'Translate the returns form in German', '3', { timeSpent: hours(1), age: 2 * DAY, blocked: true }),
  ticket('SHOP-448', 'Send a reminder e-mail for abandoned carts', '6', { timeSpent: hours(9), age: 3 * DAY }),
  ticket('SHOP-440', 'Speed up the search suggestions', '7', { timeSpent: hours(4.5), age: 4 * DAY })
]

stub('jira', {
  Jira: class {
    boardColumns = async () => columns
    tickets = async () => tickets
    unassigned = async () => [
      ticket('SHOP-493', 'Show stock levels in the store locator', '1', { age: 5 * HOUR }),
      ticket('SHOP-494', 'Remember the last chosen delivery option', '1', { age: DAY })
    ]
    week = async () => ({
      today: hours(4.75),
      week: hours(22.5),
      dailyTarget: hours(7),
      weeklyTarget: hours(35),
      byTicket: {
        'SHOP-482': { today: hours(2.25), week: hours(5.5) },
        'SHOP-477': { today: hours(1.5), week: hours(3) },
        'SHOP-469': { today: hours(1), week: hours(4) }
      }
    })
  }
})

const pr = (number, title, branch, extra = {}) => ({
  id: `PR_${number}`,
  number,
  title,
  url: `https://github.com/acme/shop/pull/${number}`,
  repo: 'shop',
  repoFull: 'acme/shop',
  branch,
  head: `${number}abcdef`,
  base: 'main',
  commitCount: 1,
  state: 'OPEN',
  draft: false,
  decision: 'REVIEW_REQUIRED',
  mergeable: 'MERGEABLE',
  checks: 'SUCCESS',
  lastPush: ago(HOUR),
  author: 'you',
  avatar: '',
  createdAt: ago(DAY),
  updatedAt: ago(HOUR),
  additions: 120,
  deletions: 30,
  files: 6,
  reviews: [],
  myReview: null,
  ...extra
})

stub('github', {
  pullRequests: async () => ({
    viewer: 'you',
    mine: [
      pr(1208, 'SHOP-482 Show delivery dates on the product page', 'SHOP-482-delivery-dates', { checks: 'PENDING', draft: true }),
      pr(1201, 'SHOP-469 Filter the catalogue by material and finish', 'SHOP-469-material-filter', { decision: 'APPROVED' }),
      pr(1195, 'SHOP-455 Fix the coupon field losing focus on mobile', 'SHOP-455-coupon-focus', { decision: 'CHANGES_REQUESTED', checks: 'FAILURE' }),
      pr(1187, 'SHOP-448 Send a reminder e-mail for abandoned carts', 'SHOP-448-cart-reminder', { state: 'MERGED' }),
      pr(1176, 'SHOP-440 Speed up the search suggestions', 'SHOP-440-search-speed', { state: 'MERGED' }),
      pr(1210, 'Bump the image library to the latest minor', 'bump-images', { createdAt: ago(3 * HOUR) })
    ],
    reviews: [
      { ...pr(1206, 'SHOP-471 Add gift wrapping at checkout', 'SHOP-471-gift-wrap', { author: 'camille' }), requested: true },
      { ...pr(1199, 'SHOP-466 Cache the menu per country', 'SHOP-466-menu-cache', { author: 'sam', decision: 'APPROVED' }), requested: false }
    ]
  }),
  qualifDeploys: async () => ({})
})

stub('claude', {
  live: async () => [
    { id: 'demo-1', status: 'working', seen: false, title: 'Delivery dates on the product page', prompt: '/jira SHOP-482', message: '', cwd: '', project: 'shop', pid: 1, since: now - 20 * MIN, keys: ['SHOP-482'] },
    { id: 'demo-2', status: 'needs-you', seen: false, title: 'Shared carts', prompt: '/jira SHOP-477', message: 'Can I run the migration on the local database?', cwd: '', project: 'shop', pid: 2, since: now - 5 * MIN, keys: ['SHOP-477'] }
  ],
  past: () => [
    { id: 'demo-3', title: 'Material filter', prompt: '/jira SHOP-469', cwd: '', updated: now - 3 * HOUR, keys: ['SHOP-469'] },
    { id: 'demo-4', title: 'Coupon focus on mobile', prompt: '/jira SHOP-455', cwd: '', updated: now - DAY, keys: ['SHOP-455'] }
  ],
  watch: () => () => {},
  focus: async () => false
})

stub('timer', {
  Timer: class {
    state = { running: { key: 'SHOP-482', startedAt: now - 23 * MIN }, unlogged: {} }
    start() {}
    stop() {}
    clear() {}
  }
})

stub('qualifs', {
  NUMBERS: Array.from({ length: 15 }, (_, i) => i + 1),
  Qualifs: class {
    list = () => [{ number: 4, tickets: ['SHOP-469'], last: null, current: null }]
  }
})

const run = (id, extra) => ({ id, workflow: 'autopilot', label: 'Solve the next ticket', terminal: `run:${id}`, pr: null, question: null, events: [], open: false, dismissed: false, ...extra })
stub('runs', {
  dir: os.tmpdir(),
  Runs: class {
    list = () => [
      run('autopilot-2', {
        status: 'waiting',
        open: true,
        ticket: 'SHOP-490',
        stage: 'Judges agreed on candidate b',
        startedAt: now - 52 * MIN,
        stageSince: now - 3 * MIN,
        question: { text: 'SHOP-490: candidate b adds the size guide as a product tab, with 6 unit tests and PHPStan clean. 3 judges of 3 picked it. Open the draft PR?', options: ['Open draft PR', 'Stop here'], asked: now - 3 * MIN }
      }),
      run('autopilot-1', { status: 'done', session: '7f3c2a10-5b1e-4d2a-9c4e-2b8f6d1a0e93', ticket: 'SHOP-482', pr: 'https://github.com/acme/shop/pull/1208', message: 'Draft PR opened', startedAt: now - DAY, finishedAt: now - DAY + 70 * MIN })
    ]
    live = () => null
    get = id => this.list().find(r => r.id === id)
    resumed() {}
    watch() {}
    terminalExited() {}
  }
})

process.env.ATELIER_SHOT ||= path.join(__dirname, 'screenshot.png')
require(path.join(src, 'main.js'))
