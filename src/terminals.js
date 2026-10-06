const pty = require('@lydell/node-pty')
const { env } = require('./run')
const { editorArgs } = require('./config')

const SCROLLBACK_BYTES = 2 * 1024 * 1024
const quote = value => `'${String(value).replace(/'/g, `'\\''`)}'`

class Terminals {
  constructor(send, claudeCommand, editor) {
    this.send = send
    this.claudeCommand = claudeCommand
    this.editor = editor
    this.items = new Map()
    this.pending = new Map()
    this.flushTimer = null
    this.size = { cols: 120, rows: 36 }
  }

  list() {
    return [...this.items.values()].map(({ pty: _pty, output: _output, ...item }) => item)
  }

  running() {
    return this.list().filter(item => !item.exited && item.kind === 'claude')
  }

  get(id) {
    return this.items.get(id)
  }

  spawn(id, { cwd, args = [], label, key = null, prId = null, runId = null, kind = 'claude', parent = null, command = null, env: extraEnv = {} }) {
    const existing = this.items.get(id)
    if (existing && !existing.exited) return existing
    const shell = process.env.SHELL || '/bin/zsh'
    const childEnv = { ...env, ...extraEnv, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'atelier' }
    for (const name of Object.keys(childEnv)) if (name.startsWith('ELECTRON_') || name === 'CHROME_DESKTOP') delete childEnv[name]
    const program = kind === 'claude' ? this.claudeCommand : command
    const shellArgs = program ? ['-ic', `exec ${quote(program)} ${args.map(quote).join(' ')}`] : ['-i']
    const child = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: this.size.cols,
      rows: this.size.rows,
      cwd,
      env: childEnv
    })
    const item = { id, key, prId, runId, label, cwd, kind, parent, pid: child.pid, startedAt: Date.now(), exited: false, exitCode: null, pty: child, output: '' }
    this.items.set(id, item)
    child.onData(data => {
      item.output = (item.output + data).slice(-SCROLLBACK_BYTES)
      this.queue(id, data)
    })
    child.onExit(({ exitCode }) => {
      this.flush()
      item.exited = true
      item.exitCode = exitCode
      this.send('term-exit', id, exitCode)
      this.onExit?.(item)
      this.onChange?.()
    })
    this.onChange?.()
    return item
  }

  queue(id, data) {
    this.pending.set(id, (this.pending.get(id) || '') + data)
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), 8)
  }

  flush() {
    clearTimeout(this.flushTimer)
    this.flushTimer = null
    for (const [id, data] of this.pending) this.send('term-data', id, data)
    this.pending.clear()
  }

  replay(id) {
    return this.items.get(id)?.output || ''
  }

  write(id, data) {
    const item = this.items.get(id)
    if (item && !item.exited) item.pty.write(data)
  }

  resize(id, cols, rows) {
    const item = this.items.get(id)
    if (item && !item.exited && cols > 1 && rows > 1) item.pty.resize(cols, rows)
  }

  setSize(cols, rows) {
    if (cols > 1 && rows > 1) this.size = { cols, rows }
  }

  close(id, { keepChildren = false } = {}) {
    const item = this.items.get(id)
    if (!item) return
    if (!keepChildren) for (const child of [...this.items.values()]) if (child.parent === id) this.close(child.id)
    if (!item.exited) item.pty.kill()
    this.items.delete(id)
    this.onChange?.()
  }

  spawnShell(parent) {
    const owner = this.items.get(parent)
    if (!owner) throw new Error('That session is gone')
    let n = 1
    while (this.items.has(`${parent}~shell-${n}`)) n++
    return this.spawn(`${parent}~shell-${n}`, { cwd: owner.cwd, kind: 'shell', parent, label: 'Shell' })
  }

  spawnEditor(parent) {
    const owner = this.items.get(parent)
    if (!owner) throw new Error('That session is gone')
    return this.spawn(`${parent}~editor`, { cwd: owner.cwd, kind: 'shell', parent, label: this.editor.name, command: this.editor.command, args: editorArgs(this.editor, owner.cwd) })
  }

  killAll() {
    for (const item of this.items.values()) if (!item.exited) item.pty.kill()
  }
}

module.exports = { Terminals }
