const fs = require('node:fs')
const path = require('node:path')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeAtomic(file, text, options) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file + '.tmp', text, options)
  fs.renameSync(file + '.tmp', file)
}

const writeJson = (file, value) => writeAtomic(file, JSON.stringify(value, null, 2) + '\n')

function watchDir(dir, onChange, { poll = 0 } = {}) {
  let timer = null
  const fire = () => {
    clearTimeout(timer)
    timer = setTimeout(onChange, 250)
  }
  const attach = () => {
    try {
      fs.mkdirSync(dir, { recursive: true })
      return fs.watch(dir, fire)
    } catch {
      return null
    }
  }
  let watcher = attach()
  const interval = poll && setInterval(() => {
    watcher ||= attach()
    fire()
  }, poll)
  return () => {
    clearInterval(interval)
    watcher?.close()
  }
}

module.exports = { readJson, writeAtomic, writeJson, watchDir }
