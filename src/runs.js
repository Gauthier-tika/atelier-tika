const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { readJson, writeJson, watchDir } = require('./store')

const stateDir = path.join(os.homedir(), '.local/state/atelier')
const dir = path.join(stateDir, 'runs')
const marksFile = path.join(stateDir, 'run-marks.json')
const KEEP_MS = 14 * 86400000
const LIVE = ['starting', 'running', 'waiting']

const stamp = date => date.toISOString().replace(/\D/g, '').slice(0, 14)

class Runs {
  constructor(onChange) {
    this.onChange = onChange
    this.marks = readJson(marksFile, {})
  }

  mark(id, patch) {
    this.marks[id] = { ...this.marks[id], ...patch }
    writeJson(marksFile, this.marks)
    this.onChange()
  }

  create(workflow) {
    const now = new Date()
    const id = `${workflow.id}-${stamp(now)}`
    const run = {
      id,
      workflow: workflow.id,
      label: workflow.label,
      terminal: `run:${id}`,
      session: crypto.randomUUID(),
      cwd: workflow.cwd,
      startedAt: now.getTime(),
      status: 'starting',
      stage: null,
      ticket: null,
      pr: null,
      question: null,
      events: []
    }
    writeJson(path.join(dir, `${run.id}.json`), run)
    this.onChange()
    return run
  }

  read() {
    let names = []
    try {
      names = fs.readdirSync(dir).filter(name => name.endsWith('.json'))
    } catch {}
    return names.map(name => readJson(path.join(dir, name), null)).filter(run => run?.id)
  }

  list() {
    const old = Date.now() - KEEP_MS
    return this.read().filter(run => {
      if (run.startedAt >= old) return true
      fs.rmSync(path.join(dir, `${run.id}.json`), { force: true })
      if (this.marks[run.id]) {
        delete this.marks[run.id]
        writeJson(marksFile, this.marks)
      }
      return false
    }).map(run => {
      const marks = this.marks[run.id] || {}
      const answered = run.question && marks.answered === run.question.asked
      const status = marks.ended && LIVE.includes(run.status) ? 'ended' : answered ? 'running' : run.status
      return { ...run, status, question: answered ? null : run.question, dismissed: Boolean(marks.dismissed) }
    }).sort((a, b) => b.startedAt - a.startedAt)
  }

  get(id) {
    const run = this.list().find(r => r.id === id)
    if (!run) throw new Error('That workflow run is gone')
    return run
  }

  live(workflowId) {
    return this.list().find(run => run.workflow === workflowId && LIVE.includes(run.status)) || null
  }

  answered(id, asked) {
    this.mark(id, { answered: asked })
  }

  resumed(id) {
    this.mark(id, { ended: false })
  }

  dismiss(id) {
    this.mark(id, { dismissed: true })
  }

  endLive() {
    for (const run of this.list()) if (LIVE.includes(run.status)) this.mark(run.id, { ended: true })
  }

  terminalExited(terminal) {
    for (const run of this.list()) if (run.terminal === terminal && LIVE.includes(run.status)) this.mark(run.id, { ended: true })
  }

  watch() {
    watchDir(dir, this.onChange)
  }
}

module.exports = { Runs, dir, LIVE }
