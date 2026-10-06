const { execFile, spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const home = os.homedir()
const extraPath = [
  path.join(home, '.local/bin'),
  path.join(home, '.local/share/mise/shims'),
  path.join(home, '.local/share/sapling')
]
const env = Object.fromEntries(
  Object.entries({ ...process.env, PATH: [...extraPath, process.env.PATH].join(':') })
    .filter(([name]) => !/^CLAUDE/.test(name))
)

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { env, maxBuffer: 32 * 1024 * 1024, timeout: 60000, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

function detach(command, args, options = {}) {
  const child = spawn(command, args, { env, detached: true, stdio: 'ignore', ...options })
  child.on('error', () => {})
  child.unref()
  return child
}

function executable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

const onPath = command => command.includes('/') ? executable(command) : env.PATH.split(':').some(dir => executable(path.join(dir, command)))

const quote = value => `'${String(value).replace(/'/g, `'\\''`)}'`
const shell = process.env.SHELL || '/bin/zsh'

module.exports = { run, detach, env, onPath, quote, shell }
