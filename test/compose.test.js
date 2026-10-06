const test = require('node:test')
const assert = require('node:assert/strict')
const demo = require('../demo/fixture')
const { compose, qualifPrs } = require('../src/compose')

const data = (extra = {}) => ({
  columns: demo.columns,
  tickets: demo.tickets,
  unassigned: demo.unassigned,
  github: demo.github,
  live: demo.live,
  past: demo.past,
  time: demo.week,
  qualifs: demo.qualifs,
  runs: demo.runs,
  errors: {},
  loading: {},
  updated: {},
  ...extra
})
const run = ({ extra, config, timer = demo.timer, terminals = [] } = {}) =>
  compose(data(extra), timer, { ...demo.config, ...config }, terminals)
const keys = list => list.map(item => item.key)

test('tickets needing you come first, then by column group, blocked last within a group', () => {
  assert.deepEqual(keys(run().tickets), ['SHOP-477', 'SHOP-455', 'SHOP-490', 'SHOP-482', 'SHOP-461', 'SHOP-469', 'SHOP-448', 'SHOP-440'])
})

test('a ticket goes to the filter that holds its column, otherwise to My tickets', () => {
  const stages = Object.fromEntries(run().tickets.map(t => [t.key, t.stage]))
  assert.equal(stages['SHOP-448'], 'filter-0')
  assert.equal(stages['SHOP-440'], 'filter-1')
  assert.equal(stages['SHOP-482'], 'mine')
})

test('mineColumns hides the tickets of the unchecked columns, but not those of a filter', () => {
  const state = run({ config: { mineColumns: ['In Progress / PR'] } })
  assert.deepEqual(keys(state.tickets), ['SHOP-477', 'SHOP-482', 'SHOP-461', 'SHOP-448', 'SHOP-440'])
})

test('hiddenColumns drops tickets by the column name Atelier shows', () => {
  assert.ok(!keys(run({ config: { hiddenColumns: ['Code review'] } }).tickets).includes('SHOP-469'))
})

test('a ticket gets its live session, or else its last past one', () => {
  const byKey = Object.fromEntries(run().tickets.map(t => [t.key, t]))
  assert.equal(byKey['SHOP-482'].session.id, 'demo-1')
  assert.equal(byKey['SHOP-482'].previous, null)
  assert.equal(byKey['SHOP-469'].session, undefined)
  assert.equal(byKey['SHOP-469'].previous.id, 'demo-3')
})

test('a session embedded for a rebase, a review or a run is not taken as the ticket session', () => {
  const terminals = [{ id: 'rebase:SHOP-482', pid: 1, exited: false }]
  const ticket = run({ terminals }).tickets.find(t => t.key === 'SHOP-482')
  assert.equal(ticket.session, undefined)
})

test('open pull requests without a ticket and sessions without one are listed apart', () => {
  const state = run()
  assert.deepEqual(state.loosePrs.map(pr => pr.number), [1210])
  assert.deepEqual(state.looseSessions, [])
})

test('reviews are grouped by what they wait for', () => {
  assert.deepEqual(run().reviews.map(pr => [pr.number, pr.group]), [[1206, 'waiting'], [1199, 'approved']])
})

test('unassigned tickets show their board column', () => {
  assert.deepEqual(run().unassigned.map(t => t.column), ['To Do', 'To Do'])
})

test('a qualif holding a single pull request deploys that pull request branch', () => {
  const [item] = run().qualifs.items
  assert.equal(item.branch, 'SHOP-469-material-filter')
  assert.equal(item.direct, true)
  assert.equal(item.url, 'https://qualif4.example.com')
  assert.deepEqual(item.toSync.map(pr => pr.number), [1201])
})

test('without a workflow a qualif rebuilds its own branch', () => {
  const qualif = { ...demo.config.qualif, workflow: null }
  const [item] = run({ config: { qualif } }).qualifs.items
  assert.equal(item.branch, 'qualif-you-4')
  assert.equal(item.direct, false)
})

test('a qualif holding several pull requests rebuilds its own branch', () => {
  const [item] = run({ extra: { qualifs: [{ number: 4, tickets: ['SHOP-469', 'SHOP-482'], last: null, current: null }] } }).qualifs.items
  assert.equal(item.branch, 'qualif-you-4')
  assert.equal(item.direct, false)
  assert.deepEqual(item.toSync.map(pr => pr.number), [1201, 1208])
})

test('a qualif shows the deployment of the branch it last synced', () => {
  const synced = { at: 1, tickets: ['SHOP-469'], prs: [{ number: 1201, head: '1201abcdef' }], branch: 'qualif-you-4' }
  const deploys = { 'qualif-you-4': { status: 'completed' } }
  const [item] = run({ extra: { deploys, qualifs: [{ number: 4, tickets: ['SHOP-469'], synced }] } }).qualifs.items
  assert.equal(item.deploy, deploys['qualif-you-4'])
  assert.equal(item.upToDate, true)
})

test('qualif numbers in use are not offered again, and only tickets with an open pull request are', () => {
  const qualifs = run().qualifs
  assert.ok(!qualifs.free.includes(4))
  assert.equal(qualifs.free.length, 14)
  assert.deepEqual(qualifs.candidates.map(c => c.key), ['SHOP-482', 'SHOP-469', 'SHOP-455'])
})

test('a ticket whose pull requests are all merged is marked merged', () => {
  const [row] = qualifPrs(['SHOP-448'], demo.tickets, demo.github.mine, 'shop')
  assert.deepEqual(row.prs, [])
  assert.equal(row.merged, true)
})
