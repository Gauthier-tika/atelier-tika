document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') || ''

const svg = (body, filled = false) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

const G = {
  claude: svg('<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z"/>', true),
  stop: svg('<rect width="13" height="13" x="5.5" y="5.5" rx="2"/>', true),
  flag: svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  refresh: svg('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  pr: svg('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/>'),
  draft: svg('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 6V5"/><path d="M18 11v-1"/><path d="M6 9v12"/>'),
  merged: svg('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>'),
  closed: svg('<circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><path d="m21 3-6 6"/><path d="m21 9-6-6"/><path d="M18 11.5V15"/><circle cx="18" cy="18" r="3"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  cross: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  pending: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  open: svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  terminal: svg('<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>'),
  plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  rebase: svg('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V9a4 4 0 0 1 4-4h6"/><path d="m13 2 3 3-3 3"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  smartlog: svg('<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10"/><path d="M6 9a6 6 0 0 0 6 3h4"/>'),
  broom: svg('<path d="m13 11 9-9"/><path d="M14.6 12.6c.8.8.9 2.1.2 3L10 21l-7-7 5.4-4.8c.9-.7 2.2-.6 3 .2Z"/><path d="m6.8 10.4 6.8 6.8"/>'),
  list: svg('<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>'),
  flask: svg('<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>'),
  rocket: svg('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'),
  userPlus: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'),
  filter: svg('<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/>'),
  server: svg('<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>'),
  folder: svg('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
  settings: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  workflow: svg('<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  panes: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M12 12h9"/>'),
  sidebar: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')
}

function stored(key, parse, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : parse(value)
  } catch {
    return fallback
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const ui = {
  state: null,
  repo: stored('atelier.repo', value => value, null),
  tab: 'mine',
  person: stored('atelier.person', value => value || null, null),
  settingsTab: stored('atelier.settingsTab', value => ['tickets', 'qualifs'].includes(value) ? value : 'global', 'global'),
  hiddenRepos: stored('atelier.hiddenRepos', value => new Set(JSON.parse(value)), new Set()),
  repoMenu: false,
  confirm: null,
  drafts: {},
  logs: new Set(),
  busy: new Set(),
  jiraDraft: {}
}

const $ = id => document.getElementById(id)

const railWidth = x => Math.round(Math.min(420, Math.max(180, x)))

function setRail(width) {
  if (width) document.documentElement.style.setProperty('--rail-width', `${width}px`)
  else document.documentElement.style.removeProperty('--rail-width')
}

setRail(stored('atelier.rail', value => Number(value) ? railWidth(Number(value)) : null, null))

function dragRail(event) {
  if (event.button !== 0) return
  event.preventDefault()
  document.body.classList.add('resizing')
  let width = null
  const move = e => {
    width = railWidth(e.clientX)
    setRail(width)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.classList.remove('resizing')
    if (width) store('atelier.rail', width)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

$('rail-handle').addEventListener('pointerdown', dragRail)
$('rail-handle').addEventListener('dblclick', () => {
  setRail(null)
  store('atelier.rail', '')
})

function setRailHidden(hidden) {
  document.body.classList.toggle('rail-hidden', hidden)
  const label = hidden ? 'Show the sidebar' : 'Hide the sidebar'
  for (const toggle of [$('rail-toggle'), $('rail-tab')]) {
    toggle.title = `${label} (Ctrl+B)`
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('aria-expanded', String(!hidden))
  }
  store('atelier.railHidden', hidden ? '1' : '')
}

const toggleRail = () => setRailHidden(!document.body.classList.contains('rail-hidden'))

$('rail-toggle').innerHTML = `<span class="glyph">${G.sidebar}</span>`
$('rail-toggle').addEventListener('click', toggleRail)
$('rail-tab').innerHTML = `<span class="glyph">${G.back}</span>`
$('rail-tab').addEventListener('click', toggleRail)
setRailHidden(stored('atelier.railHidden', value => value === '1', false))

document.addEventListener('keydown', event => {
  if (event.code !== 'KeyB' || !event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return
  if (event.target.closest('.xterm, .menu, dialog')) return
  event.preventDefault()
  toggleRail()
}, true)

const painted = new WeakMap()

function paint(el, html, force = false) {
  if (!force && painted.get(el) === html) return
  painted.set(el, html)
  el.innerHTML = html
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const dataAttrs = data => Object.entries(data).map(([name, value]) => `data-${name}="${esc(value)}"`).join(' ')

const confirming = (type, match) => ui.confirm?.type === type && Object.entries(match).every(([name, value]) => ui.confirm[name] === value)

function confirmBox({ question, act, data, label, busyLabel = label, busy = false, disabled = busy }) {
  return `<div class="confirm">
      <span class="question">${question}</span>
      <button class="btn primary" data-act="${act}" ${dataAttrs(data)} ${disabled ? 'disabled' : ''}>${busy ? busyLabel : label}</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>`
}

function jiraKey(key, url, title = `Open ${key} in Jira`) {
  return url
    ? `<button class="key code" data-act="open-url" data-url="${esc(url)}" title="${esc(title)}">${esc(key)}</button>`
    : `<span class="key code">${esc(key)}</span>`
}

function removeButton({ act, data, label, disabled = false }) {
  return `<button class="unassign" data-act="${act}" ${dataAttrs(data)} title="${esc(label)}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''}><span class="glyph">${G.cross}</span></button>`
}

function duration(seconds) {
  const minutes = Math.round(seconds / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function clockText(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ago(value) {
  const ms = Date.now() - (typeof value === 'number' ? value : Date.parse(value))
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function age(value) {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86400000)
  return days < 1 ? 'opened today' : `open ${plural(days, 'day')}`
}

function parseDuration(text) {
  const s = text.trim().toLowerCase().replace(',', '.').replace(/\s+/g, '')
  let match = s.match(/^(\d+(?:\.\d+)?)h(?:(\d+)m?)?$/)
  if (match) return Math.round((parseFloat(match[1]) * 60 + parseInt(match[2] || '0', 10)) * 60)
  match = s.match(/^(\d+)(?:m|min)$/)
  if (match) return parseInt(match[1], 10) * 60
  match = s.match(/^(\d+(?:\.\d+)?)$/)
  if (match) {
    const n = parseFloat(match[1])
    return Math.round(n <= 12 ? n * 3600 : n * 60)
  }
  return NaN
}

function localDay(date = new Date()) {
  return date.toLocaleDateString('sv')
}

const validDuration = seconds => seconds >= 60 && seconds <= 86400

function roundedForLog(seconds) {
  return Math.max(300, Math.round(seconds / 300) * 300)
}

function prLook(pr) {
  if (pr.state === 'MERGED') return ['green', G.merged, 'Merged']
  if (pr.state === 'CLOSED') return ['', G.closed, 'Closed']
  if (pr.mergeable === 'CONFLICTING') return ['red', G.pr, 'Conflicts']
  if (pr.draft) return ['', G.draft, 'Draft']
  if (pr.decision === 'APPROVED') return ['green', G.pr, 'Approved']
  if (pr.decision === 'CHANGES_REQUESTED') return ['sand', G.pr, 'Changes requested']
  return ['cyan', G.pr, 'In review']
}

function checks(pr) {
  if (!pr.checks || pr.state !== 'OPEN') return ''
  if (pr.checks === 'SUCCESS') return `<span class="glyph checks ok" title="Checks passed">${G.check}</span>`
  if (pr.checks === 'FAILURE' || pr.checks === 'ERROR') return `<span class="glyph checks fail" title="Checks failed">${G.cross}</span>`
  return `<span class="glyph checks wait" title="Checks running">${G.pending}</span>`
}

function prChip(pr) {
  const [color, glyph, label] = prLook(pr)
  return `<button class="chip pr-chip ${color}" data-act="open-url" data-url="${esc(pr.url)}" title="Open #${pr.number} on GitHub">
    <span class="glyph">${glyph}</span><span class="label">${label}</span><span class="code">#${pr.number}</span>${checks(pr)}</button>`
}

const navItems = state => [
  { tab: 'time', label: 'My time entry', glyph: 'clock' },
  { tab: 'mine', label: 'Tickets', glyph: 'list' },
  ...(state?.filters || []).map(filter => ({ tab: filter.id, label: filter.label, glyph: G[filter.icon] ? filter.icon : 'filter', sub: true })),
  ...(state && !state.jira.unassignedColumns.length ? [] : [{ tab: 'unassigned', label: 'Unassigned', glyph: 'userPlus', sub: true }]),
  ...(state && !state.qualifs ? [] : [{ tab: 'qualifs', label: `${state?.qualifs.label || 'Qualif'}s`, glyph: 'server' }]),
  { tab: 'reviews', label: 'To review', glyph: 'eye' },
  { tab: 'settings', label: 'Settings', glyph: 'settings' }
]

function navCount(state, tab) {
  if (!state) return 0
  if (tab === 'unassigned') return state.unassigned.length
  if (tab === 'qualifs') return state.qualifs?.items.length || 0
  if (tab === 'reviews') return state.reviews.filter(pr => pr.group === 'waiting' && !ui.hiddenRepos.has(pr.repo)).length
  if (tab === 'settings') return 0
  if (tab === 'time') return state.time?.entries?.length || 0
  return ticketsIn(state, tab).length
}

function renderNav() {
  const listing = document.body.dataset.view === 'list'
  paint($('tabs'), navItems(ui.state).map(item => {
    const current = listing && ui.tab === item.tab
    const count = navCount(ui.state, item.tab)
    return `<button data-tab="${item.tab}" class="${item.sub ? 'sub' : ''}" aria-current="${current ? 'page' : 'false'}" title="${esc(item.label)}">
      <span class="glyph">${G[item.glyph]}</span><span class="t">${esc(item.label)}</span><span class="count code">${count || ''}</span></button>`
  }).join(''))
}

function render() {
  const state = ui.state
  if (!state) return
  const active = document.activeElement
  const focusKey = active?.dataset?.draft ? `[data-draft="${active.dataset.draft}"]` : active?.dataset?.newKey !== undefined ? '[data-new-key]' : null
  const selection = focusKey ? [active.selectionStart, active.selectionEnd] : null
  syncFilterPanes(state)
  const panes = ['mine', ...state.filters.map(f => f.id), 'unassigned', 'time', 'qualifs', 'reviews']
  const scroll = Object.fromEntries(panes.map(id => [id, $(id).scrollTop]))

  renderToday(state)
  renderClock(state)
  renderSync(state)
  renderMine(state)
  for (const filter of state.filters) renderStage(state, filter.id, filter.label)
  renderUnassigned(state)
  renderTime(state)
  if (!(active?.tagName === 'SELECT' && active.closest('#qualifs'))) renderQualifs(state)
  renderReviews(state)
  if (!(active?.matches('input:not([type="checkbox"]), select, textarea') && $('settings').contains(active))) renderSettings(state)
  renderLaunch(state)
  renderNav()

  renderSession()

  for (const id of panes) $(id).scrollTop = scroll[id]
  if (focusKey) {
    const input = [...document.querySelectorAll(focusKey)].find(el => el.offsetParent !== null)
    if (input) {
      input.focus()
      input.setSelectionRange(...selection)
    }
  }
}

function tick() {
  for (const el of document.querySelectorAll('[data-since]')) {
    const ticket = ui.state?.tickets.find(t => t.time.runningSince === Number(el.dataset.since))
    const carried = el.closest('.play') && ticket ? ticket.time.unlogged * 1000 : 0
    el.textContent = clockText(Date.now() - Number(el.dataset.since) + carried)
  }
}

let toastTimer = null

function toast(message, isError = false) {
  if (!message) return
  const el = $('toast')
  el.textContent = message
  el.classList.toggle('error', isError)
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 6000 : 3000)
}

function ask({ message, detail, confirm, cancel }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'ask'
  dialog.innerHTML = `<form method="dialog">
      <p class="message">${esc(message)}</p>
      ${detail ? `<p class="detail">${esc(detail)}</p>` : ''}
      <div class="actions">
        <button class="btn quiet" value="cancel" autofocus>${esc(cancel)}</button>
        <button class="btn primary" value="confirm">${esc(confirm)}</button>
      </div>
    </form>`
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
  document.body.append(dialog)
  dialog.showModal()
  return new Promise(resolve => dialog.addEventListener('close', () => {
    dialog.remove()
    resolve(dialog.returnValue === 'confirm')
  }))
}

async function act(name, payload, busyKey) {
  if (busyKey) {
    if (ui.busy.has(busyKey)) return null
    ui.busy.add(busyKey)
    render()
  }
  try {
    const result = await window.atelier.action(name, payload)
    if (result.ok) toast(result.message)
    else toast(result.error, true)
    if (result.ok && result.view) openSession(result.view)
    if (result.ok && result.web) openWeb(result.web)
    return result
  } finally {
    if (busyKey) {
      ui.busy.delete(busyKey)
      render()
    }
  }
}

function askConfirm(confirm, button) {
  ui.confirm = confirm
  render()
  ;[...document.querySelectorAll(button)].find(el => el.offsetParent !== null)?.focus()
}

async function confirmed(type, match, run) {
  if (!confirming(type, match)) return null
  const result = await run()
  if (result?.ok) ui.confirm = null
  render()
  return result
}

const handlers = {
  noop() {},
  refresh: () => act('refresh'),
  'open-url': el => act('openUrl', { url: el.dataset.url }),
  cancel: () => {
    ui.confirm = null
    render()
  }
}

const changes = {}

const forms = {}

const confirmStillApplies = {}

document.addEventListener('click', event => {
  const el = event.target.closest('[data-act]')
  if (!el || el.disabled) return
  event.preventDefault()
  handlers[el.dataset.act]?.(el)
})

document.addEventListener('change', event => {
  changes[event.target.dataset?.pick]?.(event.target)
})

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-form]')
  const submit = form && forms[form.dataset.form]
  if (!submit) return
  event.preventDefault()
  submit(form)
})

document.addEventListener('keydown', event => {
  if (event.target.closest('.menu, dialog')) return
  if (event.target.closest('.xterm') || document.body.dataset.view === 'session') {
    if (event.key === 'Escape' && ui.confirm && !event.target.closest('.xterm')) handlers.cancel()
    return
  }
  if (event.target.closest('input, textarea')) {
    if (event.key === 'Escape') event.target.blur()
    return
  }
  if (event.key === 'Escape' && ui.repoMenu) {
    ui.repoMenu = false
    render()
  } else if (event.key === 'Escape' && ui.confirm) handlers.cancel()
  else if (event.key === 'r' && !event.ctrlKey && !event.metaKey) act('refresh')
  else if (event.key === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) toggleMine()
  else {
    const item = navItems(ui.state)[Number(event.key) - 1]
    if (item) setTab(item.tab)
  }
})

function markFilterPane() {
  for (const pane of document.querySelectorAll('.pane.filter')) pane.classList.toggle('current', pane.id === ui.tab)
}

function setTab(tab) {
  ui.tab = tab
  $('panes').dataset.tab = tab
  $('tabs').dataset.tab = tab
  markFilterPane()
  renderNav()
}

$('tabs').addEventListener('click', event => {
  const button = event.target.closest('button[data-tab]')
  if (!button) return
  const tab = button.dataset.tab
  const listing = document.body.dataset.view === 'list'
  if (document.body.dataset.view === 'session') showList()
  if (document.body.dataset.view === 'web') closeWeb()
  const sub = navItems(ui.state).find(item => item.tab === tab)?.sub
  setTab(listing && sub && ui.tab === tab ? 'mine' : tab)
})
