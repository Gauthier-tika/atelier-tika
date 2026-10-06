const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { readJson, writeJson } = require('../src/store')

test('writeJson creates the folder and readJson reads the file back', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-store-'))
  const file = path.join(dir, 'nested/state.json')
  writeJson(file, { a: 1 })
  assert.deepEqual(readJson(file, null), { a: 1 })
  assert.equal(fs.existsSync(file + '.tmp'), false)
  fs.rmSync(dir, { recursive: true })
})

test('readJson falls back on a missing or broken file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-store-'))
  fs.writeFileSync(path.join(dir, 'broken.json'), '{')
  assert.deepEqual(readJson(path.join(dir, 'broken.json'), {}), {})
  assert.equal(readJson(path.join(dir, 'missing.json'), null), null)
  fs.rmSync(dir, { recursive: true })
})
