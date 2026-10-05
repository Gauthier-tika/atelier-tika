const { execFile, spawn } = require('node:child_process')
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

function detach(command, args, extraEnv = {}) {
  const child = spawn(command, args, { env: { ...env, ...extraEnv }, detached: true, stdio: 'ignore' })
  child.on('error', () => {})
  child.unref()
}

module.exports = { run, detach, env }
