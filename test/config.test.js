const test = require('node:test')
const assert = require('node:assert/strict')
const { cleanQualif, cleanFilters, fill } = require('../src/config')

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

test('the legacy qualifField fills jiraField', () => {
  assert.equal(cleanQualif({}, 'customfield_1').jiraField, 'customfield_1')
  assert.equal(cleanQualif({ jiraField: 'customfield_2' }, 'customfield_1').jiraField, 'customfield_2')
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
