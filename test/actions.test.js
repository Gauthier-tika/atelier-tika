const test = require('node:test')
const assert = require('node:assert/strict')

require.cache[require.resolve('electron')] = { exports: { dialog: {} } }
const domains = ['settings', 'sessions', 'runs', 'tickets', 'qualifs']

test('no two domains define the same action', () => {
  const owner = new Map()
  for (const domain of domains) {
    for (const name of Object.keys(require(`../src/actions/${domain}`)({}))) {
      assert.ok(!owner.has(name), `${name} is defined by both ${owner.get(name)} and ${domain}`)
      owner.set(name, domain)
    }
  }
  assert.ok(owner.size > 30)
})
