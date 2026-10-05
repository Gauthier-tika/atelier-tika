const { run } = require('./run')

let check = null

const available = () => (check ||= run('sl', ['--version'], { timeout: 5000 }).then(() => true, () => false))

module.exports = { available }
