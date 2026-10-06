const os = require('node:os')
const path = require('node:path')
const { readJson, writeJson } = require('./store')

const file = path.join(os.homedir(), '.local/state/atelier/timer.json')

class Timer {
  constructor() {
    this.state = { running: null, unlogged: {}, ...readJson(file, {}) }
  }

  save() {
    writeJson(file, this.state)
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
