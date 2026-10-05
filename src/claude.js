const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { run } = require('./run')

const KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g
const projectsDir = path.join(os.homedir(), '.claude/projects')
const stateDir = path.join(process.env.XDG_RUNTIME_DIR || `/tmp/claude-sessions-${process.getuid()}`, 'claude-sessions')
const RECENT_DAYS = 30

function keysIn(...texts) {
  return [...new Set(texts.filter(Boolean).join(' ').match(KEY) || [])]
}

async function live(config) {
  try {
    const sessions = JSON.parse(await run('python3', [config.claudeSessionsBin, 'list']))
    return sessions.map(session => ({
      id: session.id,
      status: session.status,
      seen: session.seen,
      title: session.title || '',
      prompt: session.prompt || '',
      message: session.message || '',
      cwd: session.cwd,
      project: session.project,
      pid: session.pid || null,
      since: session.since,
      keys: keysIn(session.title, session.prompt, session.message)
    }))
  } catch {
    return []
  }
}

function readSlice(file, start, length) {
  const fd = fs.openSync(file, 'r')
  try {
    const buffer = Buffer.alloc(length)
    const read = fs.readSync(fd, buffer, 0, length, start)
    return buffer.subarray(0, read).toString('utf8')
  } finally {
    fs.closeSync(fd)
  }
}

function parseLines(text) {
  const entries = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue
    try {
      entries.push(JSON.parse(line))
    } catch {}
  }
  return entries
}

function promptText(entry) {
  const content = entry.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.filter(part => part.type === 'text').map(part => part.text).join(' ')
  return ''
}

const transcriptCache = new Map()

function summarize(file, stat) {
  const head = parseLines(readSlice(file, 0, Math.min(stat.size, 96 * 1024)))
  const tail = parseLines(readSlice(file, Math.max(0, stat.size - 256 * 1024), Math.min(stat.size, 256 * 1024)))
  let title = ''
  for (const entry of [...head, ...tail]) {
    const key = Object.keys(entry).find(k => k.endsWith('Title') && typeof entry[k] === 'string')
    if (String(entry.type || '').endsWith('-title') && key) title = entry[key]
  }
  const firstPrompt = head.find(entry => entry.type === 'user' && !entry.isMeta && promptText(entry).trim())
  const cwd = head.find(entry => entry.cwd)?.cwd || tail.find(entry => entry.cwd)?.cwd || ''
  const prompt = firstPrompt ? promptText(firstPrompt).replace(/\s+/g, ' ').slice(0, 300) : ''
  return {
    id: path.basename(file, '.jsonl'),
    title,
    prompt,
    cwd,
    updated: stat.mtimeMs,
    keys: keysIn(title, prompt)
  }
}

function past() {
  const cutoff = Date.now() - RECENT_DAYS * 86400000
  const result = []
  let projects = []
  try {
    projects = fs.readdirSync(projectsDir)
  } catch {
    return result
  }
  for (const project of projects) {
    const dir = path.join(projectsDir, project)
    let files = []
    try {
      files = fs.readdirSync(dir).filter(name => name.endsWith('.jsonl'))
    } catch {
      continue
    }
    for (const name of files) {
      const file = path.join(dir, name)
      let stat
      try {
        stat = fs.statSync(file)
      } catch {
        continue
      }
      if (stat.mtimeMs < cutoff) continue
      const cached = transcriptCache.get(file)
      if (cached && cached.mtime === stat.mtimeMs) {
        result.push(cached.summary)
        continue
      }
      try {
        const summary = summarize(file, stat)
        transcriptCache.set(file, { mtime: stat.mtimeMs, summary })
        result.push(summary)
      } catch {}
    }
  }
  return result.sort((a, b) => b.updated - a.updated)
}

function watch(onChange) {
  let timer = null
  const fire = () => {
    clearTimeout(timer)
    timer = setTimeout(onChange, 250)
  }
  const attach = () => {
    try {
      fs.mkdirSync(stateDir, { recursive: true })
      return fs.watch(stateDir, fire)
    } catch {
      return null
    }
  }
  let watcher = attach()
  const poll = setInterval(() => {
    if (!watcher) watcher = attach()
    fire()
  }, 30000)
  return () => {
    clearInterval(poll)
    watcher?.close()
  }
}

async function focus(config, id) {
  try {
    await run('python3', [config.claudeSessionsBin, 'focus', id])
    return true
  } catch {
    return false
  }
}

module.exports = { live, past, watch, focus }
