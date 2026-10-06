const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-config-'))
const configFile = path.join(process.env.HOME, '.config/atelier/config.json')
const { load, setSetting, cleanQualif, cleanFilters, parseInputs, fill } = require('../src/config')

const writeUser = user => {
  fs.mkdirSync(path.dirname(configFile), { recursive: true })
  fs.writeFileSync(configFile, JSON.stringify(user))
}
const readUser = () => JSON.parse(fs.readFileSync(configFile, 'utf8'))

test('a qualif section gets its defaults', () => {
  const qualif = cleanQualif({})
  assert.equal(qualif.label, 'Qualif')
  assert.equal(qualif.count, 10)
  assert.equal(qualif.branch, 'qualif-{login}-{n}')
  assert.deepEqual(qualif.inputs, {})
  assert.equal(qualif.cache, null)
  assert.equal('enabled' in qualif, false)
})

test('the qualif count stays between 1 and 99', () => {
  assert.equal(cleanQualif({ count: 500 }).count, 99)
  assert.equal(cleanQualif({ count: -3 }).count, 1)
  assert.equal(cleanQualif({ count: 'many' }).count, 10)
})

test('qualif inputs become strings and cache commands must be lists of strings', () => {
  const qualif = cleanQualif({ inputs: { n: 4 }, cache: { commands: [['echo', 'hi'], ['bad', 3], []] } })
  assert.deepEqual(qualif.inputs, { n: '4' })
  assert.deepEqual(qualif.cache, { description: '', commands: [['echo', 'hi']] })
})


test('filters keep a trimmed label, string columns and an optional icon', () => {
  assert.deepEqual(cleanFilters([{ label: ' MEP ', columns: ['A', 3], icon: 'rocket' }, { label: '  ' }, null]), [
    { label: 'MEP', columns: ['A'], icon: 'rocket' }
  ])
  assert.deepEqual(cleanFilters('nope'), [])
})

test('fill replaces known placeholders and leaves the others', () => {
  assert.equal(fill('qualif-{login}-{n}', { n: 4, login: 'you' }), 'qualif-you-4')
  assert.equal(fill('{n}-{other}', { n: 4 }), '4-{other}')
})

test('workflow inputs are name=value lines, and none at all clears them', () => {
  assert.deepEqual(parseInputs('environment = qualif{n}\n\n  region=eu '), { environment: 'qualif{n}', region: 'eu' })
  assert.equal(parseInputs('  '), null)
  assert.throws(() => parseInputs('just text'), /name=value/)
})

test('legacy keys are rewritten once in config.json', () => {
  writeUser({ stageColumns: { mepp: 'A MEPP' }, unassignedColumn: 'Backlog', qualif: { count: 3 }, qualifField: 'customfield_9' })
  const config = load()
  assert.deepEqual(config.filters, [{ label: 'À MEPP', columns: ['A MEPP'], icon: 'flask' }])
  assert.deepEqual(config.unassignedColumns, ['Backlog'])
  assert.equal(config.qualif.jiraField, 'customfield_9')
  assert.deepEqual(readUser(), {
    filters: [{ label: 'À MEPP', columns: ['A MEPP'], icon: 'flask' }],
    unassignedColumns: ['Backlog'],
    qualif: { count: 3, jiraField: 'customfield_9' }
  })
})

test('a qualif setting is cleaned, saved inside qualif and applied to the config', () => {
  writeUser({ qualif: { count: 3 } })
  const config = load()
  assert.deepEqual(setSetting(config, 'qualif.workflow', ' deploy.yml '), ['deploys'])
  setSetting(config, 'qualif.count', '12')
  setSetting(config, 'qualif.url', '')
  assert.equal(config.qualif.workflow, 'deploy.yml')
  assert.equal(config.qualif.count, 12)
  assert.deepEqual(readUser(), { qualif: { count: 12, workflow: 'deploy.yml' } })
  assert.throws(() => setSetting(config, 'qualif.count', 120), /from 1 to 99/)
})

test('turning qualifs off keeps their settings', () => {
  writeUser({ qualif: { count: 3 } })
  const config = load()
  assert.deepEqual(setSetting(config, 'qualif.enabled', false), ['jira', 'deploys'])
  assert.equal(config.qualif, null)
  assert.equal(config.qualifSettings.count, 3)
  setSetting(config, 'qualif.enabled', true)
  assert.deepEqual(readUser(), { qualif: { count: 3 } })
})

test('a top-level setting is cleaned, and an unnamed filter refused', () => {
  writeUser({})
  const config = load()
  setSetting(config, 'mineColumns', ['To Do', 4])
  assert.deepEqual(config.mineColumns, ['To Do'])
  setSetting(config, 'mineColumns', null)
  assert.deepEqual(readUser(), {})
  assert.throws(() => setSetting(config, 'filters', [{ label: ' ' }]), /Give every filter a name/)
  assert.throws(() => setSetting(config, 'theme', 'x'), /Unknown setting/)
})
