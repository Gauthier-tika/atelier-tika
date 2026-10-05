const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { env } = require('./run')

const file = path.join(os.homedir(), '.local/state/atelier/qualifs.json')
const OUTPUT_BYTES = 64 * 1024
const CACHE_FAMILIES = ['pcache_grid', 'pcache_product', 'pcache_page']
const NUMBERS = Array.from({ length: 15 }, (_, i) => i + 1)

class Qualifs {
  constructor(onChange) {
    this.onChange = onChange
    this.items = {}
    this.running = null
    try {
      this.items = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {}
  }

  save() {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file + '.tmp', JSON.stringify(this.items, null, 2))
    fs.renameSync(file + '.tmp', file)
  }

  numberOf(value) {
    const n = Number(value)
    if (!NUMBERS.includes(n)) throw new Error('Qualifs go from 1 to 15')
    return String(n)
  }

  get(number) {
    const item = this.items[this.numberOf(number)]
    if (!item) throw new Error(`Qualif ${number} is not in your list`)
    return item
  }

  list() {
    return Object.entries(this.items)
      .map(([number, item]) => ({ number: Number(number), ...item, current: this.running?.number === Number(number) ? this.running : null }))
      .sort((a, b) => a.number - b.number)
  }

  add(number) {
    const key = this.numberOf(number)
    this.items[key] ||= { tickets: [], last: null }
    this.save()
    this.onChange()
  }

  remove(number) {
    const key = this.numberOf(number)
    if (this.running?.number === Number(key)) throw new Error(`Qualif ${key} is syncing`)
    delete this.items[key]
    this.save()
    this.onChange()
  }

  assign(number, key) {
    const item = this.get(number)
    if (!item.tickets.includes(key)) item.tickets.push(key)
    this.save()
    this.onChange()
  }

  unassign(number, key) {
    const item = this.get(number)
    item.tickets = item.tickets.filter(k => k !== key)
    this.save()
    this.onChange()
  }

  sync(number, { cwd, prs, deploy, tickets }) {
    if (!prs.length) throw new Error('No open pull request to put on this qualif')
    const args = [String(number), ...prs.map(pr => String(pr.number)), deploy ? '--deploy' : '--dry-run']
    return this.exec(number, {
      kind: deploy ? 'sync' : 'preview',
      cwd,
      steps: [['qualif-sync', args]],
      record: { tickets, prs },
      done: (item, run) => { if (deploy) item.synced = { at: run.at, tickets, prs } }
    })
  }

  clearCache(number, { cwd, context }) {
    if (!/_cluster-tikamoon-qualif$/.test(context)) throw new Error(`${context} is not the qualif cluster`)
    const n = this.numberOf(number)
    const command = [`--context=${context}`, '-n', `qualif${n}-modulo`, 'exec', 'deploy/admin-deployment', '-c', 'php', '--', 'bin/console', 'app:template_cache:clear']
    return this.exec(number, {
      kind: 'cache',
      cwd,
      steps: CACHE_FAMILIES.map(family => ['kubectl', [...command, `QLF${n}${family}`]]),
      done: (item, run) => { item.cacheClearedAt = run.at }
    })
  }

  exec(number, { kind, cwd, steps, record = {}, done }) {
    const item = this.get(number)
    if (this.running) throw new Error(`Qualif ${this.running.number} is busy, wait for it to finish`)
    const run = { number: Number(number), at: Date.now(), kind, deploy: kind === 'sync', ...record, output: '', ok: null }
    this.running = run
    this.onChange()

    const append = chunk => {
      run.output = (run.output + chunk).slice(-OUTPUT_BYTES)
      this.onChange()
    }
    const step = ([command, args]) => new Promise(resolve => {
      append(`$ ${command} ${args.join(' ')}\n`)
      const child = spawn(command, args, { cwd, env })
      child.stdout.setEncoding('utf8').on('data', append)
      child.stderr.setEncoding('utf8').on('data', append)
      child.on('error', error => {
        append(`\n${error.message}\n`)
        resolve(false)
      })
      child.on('close', code => resolve(code === 0))
    })

    return (async () => {
      let ok = true
      for (const command of steps) {
        ok = await step(command)
        if (!ok) break
      }
      run.ok = ok
      this.running = null
      if (ok) done?.(item, run)
      item.last = run
      this.save()
      this.onChange()
      return run
    })()
  }
}

module.exports = { Qualifs, NUMBERS }
