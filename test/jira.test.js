const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { Jira } = require('../src/jira')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-jira-'))
const fakeJiraTime = path.join(dir, 'jira-time')
fs.writeFileSync(fakeJiraTime, `import json, sys
args = sys.argv[1:]
if args[1] == 'FAIL-1':
    print(json.dumps({"error": "Jira said no"}))
    sys.exit(1)
print(json.dumps({"ok": True, "args": args}))
`)
const jira = new Jira({ jiraTimeBin: fakeJiraTime, jiraBase: 'https://example.atlassian.net', jiraEnv: path.join(dir, 'env'), dailyHours: 7 })

test('logging, changing and deleting time pass jira-time its arguments in minutes', async () => {
  assert.deepEqual((await jira.log('SHOP-1', 5400)).args, ['log', 'SHOP-1', '90m'])
  assert.deepEqual((await jira.log('SHOP-1', 20, '2026-10-05')).args, ['log', 'SHOP-1', '1m', '2026-10-05'])
  assert.deepEqual((await jira.updateLog('SHOP-1', 42, 3600)).args, ['update', 'SHOP-1', '42', '60m'])
  assert.deepEqual((await jira.deleteLog('SHOP-1', 42)).args, ['delete', 'SHOP-1', '42'])
})

test('a jira-time failure surfaces its error', async () => {
  await assert.rejects(jira.log('FAIL-1', 600), /Jira said no/)
})
