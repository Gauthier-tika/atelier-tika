const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const file = path.join(os.homedir(), '.local/state/atelier/timer.json')

class Timer {
  constructor() {
    this.state = { running: null, unlogged: {} }
    try {
      this.state = { ...this.state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
    } catch {}
  }

  save() {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file + '.tmp', JSON.stringify(this.state))
    fs.renameSync(file + '.tmp', file)
  }

  start(key) {
    if (this.state.running?.key === key) return
    this.stop()
    this.state.running = { key, startedAt: Date.now() }
    this.save()
  }

  stop() {
    const running = this.state.running
    if (!running) return
    const seconds = Math.round((Date.now() - running.startedAt) / 1000)
    this.state.unlogged[running.key] = (this.state.unlogged[running.key] || 0) + seconds
    this.state.running = null
    this.save()
  }

  clear(key) {
    delete this.state.unlogged[key]
    if (this.state.running?.key === key) this.state.running = null
    this.save()
  }
}

module.exports = { Timer }
