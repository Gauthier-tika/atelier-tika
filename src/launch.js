const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { run, detach, quote, shell } = require('./run')
const { editorArgs, terminalArgs } = require('./config')
const wm = require('./wm')

let browserClass = null
async function browserMatcher() {
  if (!browserClass) {
    const desktop = (await run('xdg-settings', ['get', 'default-web-browser']).catch(() => 'firefox')).trim()
    browserClass = desktop.replace(/\.desktop$/, '').toLowerCase()
  }
  const short = browserClass.split(/[_.-]/)[0]
  return client => {
    const name = String(client.class || '').toLowerCase()
    return name === browserClass || name.startsWith(short)
  }
}

async function openUrl(url) {
  if (!/^https:\/\//.test(url)) throw new Error('Only https links can be opened')
  const isBrowser = await browserMatcher()
  const before = (await wm.clients()).filter(isBrowser)
  detach('xdg-open', [url])
  if (!before.length) return 'browser'
  const recent = before.reduce((a, b) => (a.recency <= b.recency ? a : b))
  setTimeout(() => wm.focus(recent.address), 350)
  return 'browser'
}

function directoryFor(config, repo, cwd) {
  if (cwd && fs.existsSync(cwd)) return cwd
  if (repo) {
    if (config.repoName === repo && fs.existsSync(config.repoDir)) return config.repoDir
    const guess = path.join(config.devDir, repo)
    if (fs.existsSync(guess)) return guess
  }
  return fs.existsSync(config.repoDir) ? config.repoDir : os.homedir()
}

function terminal(config, directory, claudeArgs) {
  const command = `claude ${claudeArgs.map(quote).join(' ')}; exec ${quote(shell)}`
  detach(config.terminal.command, terminalArgs(config.terminal, { dir: directory, shell, command }), { cwd: directory })
  return 'terminal'
}

async function editorWindow(editor, directory) {
  const child = detach(editor.command, editorArgs(editor, directory), { cwd: directory })
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', error => reject(new Error(`Could not start ${editor.name}: ${error.message}`)))
  })
  return `Opened ${path.basename(directory)} in ${editor.name}`
}

module.exports = { openUrl, terminal, directoryFor, editorWindow }
