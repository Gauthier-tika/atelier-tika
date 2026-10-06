const runKind = run => run.kind || (run.deploy ? 'sync' : 'preview')

const RUN_NAMES = {
  sync: { running: 'Syncing…', failed: 'Last sync failed', done: 'Last sync' },
  preview: { running: 'Previewing…', failed: 'Last preview failed', done: 'Last preview' },
  cache: { running: 'Clearing the cache…', failed: 'Cache clear failed', done: 'Last cache clear' }
}

function qualifStatus(q) {
  if (q.current) return ['purple', RUN_NAMES[runKind(q.current)].running]
  if (q.last && q.last.ok === false) return ['red', RUN_NAMES[runKind(q.last)].failed]
  if (!q.synced) return ['', 'Not synced from Atelier']
  if (q.upToDate) return ['green', `Synced ${ago(q.synced.at)}`]
  return ['sand', 'Out of date']
}

function qualifTicket(qualifs, q, row) {
  const label = qualifs.label
  const jira = !qualifs.jira || row.jiraQualif === q.number ? ''
    : row.jiraQualif ? `<span class="jira-qualif" title="The ${esc(label)} field in Jira points elsewhere">Jira says ${esc(label)} ${row.jiraQualif}</span>`
    : `<span class="jira-qualif" title="The PO reads this field to know where to test">${esc(label)} empty in Jira</span>`
  const prs = row.prs.length ? row.prs.map(prChip).join('')
    : row.merged ? `<span class="no-pr">Merged, already in ${esc(qualifs.base)}</span>`
    : '<span class="no-pr missing">No open pull request</span>'
  return `<li class="qualif-ticket">
    ${jiraKey(row.key, row.url)}
    <span class="summary" title="${esc(row.summary)}">${esc(row.summary || 'Not assigned to you any more')}</span>
    ${jira}
    ${prs}
    ${removeButton({ act: 'qualif-unassign', data: { number: q.number, key: row.key }, label: `Take ${row.key} off ${label} ${q.number}`, disabled: q.current })}
  </li>`
}

const PHASES = {
  running: ['purple', G.pending, 'running'],
  done: ['green', G.check, 'done'],
  failed: ['red', G.cross, 'failed'],
  cancelled: ['', G.cross, 'cancelled'],
  skipped: ['', G.check, 'skipped']
}

function deployStatus(q, cache) {
  const d = q.deploy
  if (!d) return ''
  const phase = (name, value) => {
    const [color, glyph, label] = value ? PHASES[value] || ['', G.pending, value] : d.status === 'completed' ? ['', G.cross, 'not run'] : ['', G.pending, 'waiting']
    return `<span class="phase ${color}"><span class="glyph">${glyph}</span>${name} ${label}</span>`
  }
  const cacheStale = cache && d.deploy === 'done' && d.finishedAt && (!q.cacheClearedAt || q.cacheClearedAt < Date.parse(d.finishedAt))
  return `<div class="deploy-status">
    <button class="run-link" data-act="open-url" data-url="${esc(d.url)}" title="Open the run on GitHub">Run ${ago(d.at)}</button>
    ${phase('Build', d.build)}
    ${phase('Deploy', d.deploy)}
    <span class="code head" title="Commit deployed">${esc(d.head.slice(0, 7))}</span>
    ${cacheStale ? '<span class="cache-stale">Cache not cleared since this deploy</span>'
      : cache && q.cacheClearedAt ? `<span class="cache-ok">Cache cleared ${ago(q.cacheClearedAt)}</span>` : ''}
  </div>`
}

function qualifCard(state, q) {
  const qualifs = state.qualifs
  const name = `${qualifs.label} ${q.number}`
  const [color, label] = qualifStatus(q)
  const busy = Boolean(q.current) || Boolean(qualifs.running)
  const missing = q.missing.length > 0
  const canSync = q.toSync.length && !missing && !busy
  const why = busy ? (q.current ? `${name} is syncing` : `${qualifs.label} ${qualifs.running} is syncing`)
    : missing ? 'A ticket has no open pull request'
    : !q.toSync.length ? 'Add a ticket with an open pull request first' : ''
  const choices = qualifs.candidates.filter(c => !q.tickets.some(row => row.key === c.key))
  const run = q.current || q.last
  const prList = q.toSync.map(pr => `<span class="code">#${pr.number}</span>`).join(' ')
  const jiraKeys = !qualifs.jira ? [] : q.tickets.filter(row => row.prs.length && row.jiraQualif !== q.number).map(row => `<span class="code">${esc(row.key)}</span>`)
  const deployRunning = q.deploy && q.deploy.status !== 'completed'
  const branchHint = q.direct ? 'Branch of the only pull request, deployed as it is' : 'Branch rebuilt by qualif-sync'
  const previewHint = why || (q.direct ? 'Check the pull request and show what would be deployed, deploy nothing' : 'Build the branch locally and show it, push nothing')
  const syncHint = why || (q.direct ? `Deploy ${q.branch} to ${name} as it is` : qualifs.deploys ? `Push the branch and deploy it to ${name}` : 'Push the branch')
  const cacheHint = busy ? why : deployRunning ? 'A deployment is still running: clear the cache once it is done' : `Clear the cache of ${name}`
  const syncLabel = qualifs.deploys ? 'Sync and deploy' : 'Sync'
  const syncQuestion = q.direct
    ? `Deploy <strong class="code">${esc(q.branch)}</strong>, the branch of ${prList}, to <strong>${esc(name)}</strong> as it is, without rebuilding a ${esc(qualifs.label.toLowerCase())} branch`
    : `Rebuild <strong class="code">${esc(q.branch || 'the branch')}</strong> from ${esc(qualifs.base)} + ${prList}, force-push it${qualifs.deploys ? ` and deploy it to <strong>${esc(name)}</strong>` : ''}`
  const cacheQuestion = q.cache && (q.cache.description ? esc(q.cache.description) : `Clear the cache of <strong>${esc(name)}</strong>? Atelier runs ${q.cache.commands.map(command => `<span class="code">${esc(command)}</span>`).join(', then ')}.`)
  return `<article class="qualif ${q.current ? 'running' : ''}" data-qualif="${q.number}">
    <div class="qualif-head">
      <h3>${q.url ? `<button data-act="open-url" data-url="${esc(q.url)}" title="Open ${esc(q.url)}">${esc(name)}</button>` : esc(name)}</h3>
      <span class="chip ${color}"><span class="label">${esc(label)}</span></span>
      ${q.branch ? `<span class="branch code" title="${branchHint}">${esc(q.branch)}</span>` : ''}
      <span class="qualif-actions">
        <button class="btn quiet" data-act="qualif-sync" data-number="${q.number}" ${canSync ? '' : 'disabled'} title="${esc(previewHint)}">Preview</button>
        <button class="btn primary" data-act="ask-qualif-sync" data-number="${q.number}" ${canSync ? '' : 'disabled'} title="${esc(syncHint)}">${syncLabel}</button>
        ${q.cache ? `<button class="btn quiet" data-act="ask-qualif-cache" data-number="${q.number}" ${busy ? 'disabled' : ''} title="${esc(cacheHint)}"><span class="glyph">${G.broom}</span><span class="t">Clear the cache</span></button>` : ''}
        ${removeButton({ act: 'qualif-remove', data: { number: q.number }, label: `Remove ${name} from Atelier`, disabled: q.current })}
      </span>
    </div>
    ${deployStatus(q, qualifs.cache)}
    ${q.tickets.length ? `<ul class="qualif-tickets">${q.tickets.map(row => qualifTicket(qualifs, q, row)).join('')}</ul>` : `<p class="empty">No ticket on ${esc(name)} yet.</p>`}
    ${choices.length && !q.current ? `<select class="pick" data-pick="qualif-ticket" data-number="${q.number}" aria-label="Add a ticket to ${esc(name)}">
      <option value="">Add a ticket…</option>
      ${choices.map(c => `<option value="${esc(c.key)}">${esc(c.key)} · ${esc(c.summary)}${qualifs.jira && c.qualif ? ` (Jira: ${esc(qualifs.label)} ${c.qualif})` : ''}</option>`).join('')}
    </select>` : ''}
    ${confirming('qualif-sync', { number: q.number }) ? confirmBox({
      question: `${syncQuestion}${jiraKeys.length ? `, then set ${esc(name)} in Jira on ${jiraKeys.join(', ')}` : ''}?`,
      act: 'qualif-deploy',
      data: { number: q.number },
      label: syncLabel,
      disabled: !canSync
    }) : ''}
    ${confirming('qualif-cache', { number: q.number }) && q.cache ? confirmBox({
      question: `${cacheQuestion}${deployRunning ? ' A deployment is still running.' : ''}`,
      act: 'qualif-cache',
      data: { number: q.number },
      label: 'Clear the cache',
      disabled: busy
    }) : ''}
    ${run ? `<details class="qualif-log" data-log="${q.number}" ${ui.logs.has(q.number) || q.current ? 'open' : ''}>
      <summary>${q.current ? 'Output so far' : `${RUN_NAMES[runKind(run)].done} ${ago(run.at)}${run.ok ? '' : ', failed'}`}</summary>
      <pre class="code">${esc(run.output)}</pre>
    </details>` : ''}
  </article>`
}

function renderQualifs(state) {
  const q = state.qualifs
  if (!q) {
    $('qualifs').innerHTML = ''
    return
  }
  const label = esc(q.label)
  const parts = [`<div class="pane-head">
    <h2 id="qualifs-title">${label}s <span class="count">${q.items.length || ''}</span></h2>
    ${q.free.length ? `<select class="pick" data-pick="qualif-add" aria-label="Add a ${label.toLowerCase()}">
      <option value="">Add a ${label.toLowerCase()}…</option>
      ${q.free.map(n => `<option value="${n}">${label} ${n}</option>`).join('')}
    </select>` : ''}
  </div>`]
  parts.push(`<p class="repos">Each ${label.toLowerCase()} gets its own branch, rebuilt from ${esc(q.base)} plus the open pull requests of its tickets, in this order, by <span class="code">qualif-sync</span>.${q.deploys ? ' One with a single pull request deploys that pull request\'s branch as it is.' : ''}</p>`)
  if (state.errors.github) parts.push(`<p class="notice">GitHub did not answer: ${esc(state.errors.github)}. The pull requests below may be out of date.</p>`)
  parts.push(q.items.length ? q.items.map(item => qualifCard(state, item)).join('') : `<p class="empty">Add the ${label.toLowerCase()}s you use, then pick the tickets that go on each one.</p>`)
  $('qualifs').innerHTML = parts.join('')
  for (const pre of $('qualifs').querySelectorAll('.qualif.running pre')) pre.scrollTop = pre.scrollHeight
}

Object.assign(handlers, {
  'qualif-sync': el => act('qualifSync', { number: Number(el.dataset.number), deploy: false }, `qualif:${el.dataset.number}`),
  'ask-qualif-sync': el => askConfirm({ type: 'qualif-sync', number: Number(el.dataset.number) }, `[data-qualif="${el.dataset.number}"] [data-act="qualif-deploy"]`),
  'qualif-deploy': el => {
    const number = Number(el.dataset.number)
    if (!confirming('qualif-sync', { number })) return
    ui.confirm = null
    act('qualifSync', { number, deploy: true }, `qualif:${number}`)
  },
  'ask-qualif-cache': el => askConfirm({ type: 'qualif-cache', number: Number(el.dataset.number) }, `[data-qualif="${el.dataset.number}"] [data-act="qualif-cache"]`),
  'qualif-cache': el => {
    const number = Number(el.dataset.number)
    if (!confirming('qualif-cache', { number })) return
    ui.confirm = null
    act('qualifCacheClear', { number }, `qualif:${number}`)
  },
  'qualif-unassign': el => act('qualifUnassign', { number: Number(el.dataset.number), key: el.dataset.key }),
  'qualif-remove': el => act('qualifRemove', { number: Number(el.dataset.number) })
})

Object.assign(changes, {
  'qualif-add': el => {
    el.blur()
    if (el.value) act('qualifAdd', { number: Number(el.value) })
  },
  'qualif-ticket': el => {
    el.blur()
    if (el.value) act('qualifAssign', { number: Number(el.dataset.number), key: el.value })
  }
})

Object.assign(confirmStillApplies, {
  'qualif-sync': (confirm, state) => Boolean(state.qualifs?.items.some(q => q.number === confirm.number)),
  'qualif-cache': (confirm, state) => Boolean(state.qualifs?.items.some(q => q.number === confirm.number))
})

document.addEventListener('toggle', event => {
  const number = Number(event.target.dataset?.log)
  if (!number || event.target.closest('.qualif.running')) return
  if (event.target.open) ui.logs.add(number)
  else ui.logs.delete(number)
}, true)

window.atelier.onQualifOutput((number, chunk) => {
  const item = ui.state?.qualifs?.items.find(q => q.number === number)
  if (item?.current) item.current.output += chunk
  const pre = document.querySelector(`[data-qualif="${number}"] pre`)
  if (!pre) return
  pre.textContent += chunk
  pre.scrollTop = pre.scrollHeight
})
