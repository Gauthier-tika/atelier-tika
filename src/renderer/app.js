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
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')
}

const ui = {
  state: null,
  repo: (() => {
    try {
      return localStorage.getItem('atelier.repo')
    } catch {
      return null
    }
  })(),
  tab: 'mine',
  settingsTab: (() => {
    try {
      const saved = localStorage.getItem('atelier.settingsTab')
      return ['tickets', 'qualifs'].includes(saved) ? saved : 'global'
    } catch {
      return 'global'
    }
  })(),
  hiddenRepos: (() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('atelier.hiddenRepos') || '[]'))
    } catch {
      return new Set()
    }
  })(),
  repoMenu: false,
  confirm: null,
  drafts: {},
  logs: new Set(),
  busy: new Set(),
  jiraDraft: {}
}

const $ = id => document.getElementById(id)

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

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
  if (days < 1) return 'opened today'
  return days === 1 ? 'open 1 day' : `open ${days} days`
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

function roundedForLog(seconds) {
  return Math.max(300, Math.round(seconds / 300) * 300)
}

/* Strip */

function renderToday(state) {
  const time = state.time
  if (!time) {
    $('today').innerHTML = `<span class="amount code">…</span><span class="of">logged today</span>`
    return
  }
  const target = time.dailyTarget || 25200
  const reached = time.today >= target
  const hours = Math.round(target / 3600)
  const bars = Array.from({ length: hours }, (_, i) => {
    const fill = Math.min(1, Math.max(0, time.today / 3600 - i))
    return `<span><i data-fill="${fill.toFixed(3)}"></i></span>`
  }).join('')
  $('today').innerHTML = `
    <span class="amount code ${reached ? 'reached' : ''}">${duration(time.today)}</span>
    <div class="hours ${reached ? 'reached' : ''}" aria-hidden="true">${bars}</div>
    <span class="of">of ${duration(target)} today</span>
    ${reached ? `<span class="glyph done-today" aria-hidden="true">${G.check}</span>` : ''}
    <span class="week"><span class="code">${duration(time.week)}</span> of ${duration(time.weeklyTarget)} this week</span>`
  for (const bar of $('today').querySelectorAll('[data-fill]')) bar.style.width = `${Number(bar.dataset.fill) * 100}%`
}

function renderClock(state) {
  const running = state.timer.running
  if (running) {
    $('clock').innerHTML = `
      <span class="pulse" aria-hidden="true"></span>
      <span class="elapsed code" data-since="${running.startedAt}">${clockText(Date.now() - running.startedAt)}</span>
      <button class="what" data-act="open-ticket" data-key="${esc(running.key)}" title="Open ${esc(running.key)} in Jira">
        <span class="key code">${esc(running.key)}</span>
        <span class="summary">${esc(running.summary)}</span>
      </button>
      <button class="btn" data-act="timer-stop"><span class="glyph">${G.stop}</span><span class="t">Stop</span></button>`
    return
  }
  const pending = state.tickets.filter(t => t.time.unlogged > 0)
  $('clock').innerHTML = pending.length
    ? `<span class="idle">${pending.map(t => `<span class="code">${duration(t.time.unlogged)}</span> not logged on <span class="code">${esc(t.key)}</span>`).join(', ')}</span>`
    : `<span class="idle">No timer running. Start one from a ticket.</span>`
}

function renderSync(state) {
  const loading = Object.values(state.loading).some(Boolean)
  const problems = Object.entries(state.errors).map(([source, message]) => {
    const name = { jira: 'Jira', github: 'GitHub', deploys: 'GitHub Actions', time: 'Time' }[source] || source
    return `<span class="problem" title="${esc(message)}">${name} did not answer</span>`
  })
  const stamps = Object.values(state.updated)
  const last = stamps.length ? Math.min(...stamps) : null
  $('sync').innerHTML = `
    <span>${problems.length ? problems.join('<br>') : loading ? 'Updating…' : last ? `Updated ${ago(last)}` : ''}</span>
    <button class="refresh ${loading ? 'spinning' : ''}" data-act="refresh" title="Refresh everything (R)" aria-label="Refresh everything">
      <span class="glyph">${G.refresh}</span>
    </button>`
}

/* Ticket pieces */

function track(ticket, columns) {
  const target = ui.confirm?.type === 'move' && ui.confirm.key === ticket.key ? ui.confirm.station : -1
  const stops = columns.map((name, i) => {
    const cls = i === ticket.station ? 'here' : i < ticket.station ? 'passed' : ''
    const label = i === ticket.station ? `${name} (current column)` : `Move to ${name}`
    return `<button class="stop ${cls} ${i === target ? 'target' : ''}" data-act="${i === ticket.station ? 'noop' : 'ask-move'}" data-key="${esc(ticket.key)}" data-station="${i}" title="${esc(label)}" aria-label="${esc(label)}"><i></i></button>`
  }).join('')
  return `<div class="track ${ticket.station < 0 ? 'off-board' : ''}" role="group" aria-label="Board column">${stops}</div>`
}

function withoutKey(text, key) {
  return String(text || '').replace(new RegExp(`\\b${key}\\b[\\s:–-]*`, 'g'), '').trim()
}

function sessionLook(s) {
  return {
    'needs-you': ['sand', 'Needs you'],
    working: ['purple', 'Working'],
    done: s.seen ? ['idle', 'Finished'] : ['sand', 'Finished'],
    idle: ['idle', 'Idle']
  }[s.status] || ['idle', s.status]
}

function sessionTitle(s, key) {
  return withoutKey(s.status === 'needs-you' && s.message ? s.message : s.title || s.prompt, key)
}

function claudeChip(ticket) {
  const s = ticket.session
  const chip = (color, label, title) => `<button class="chip claude-chip ${color}" data-act="claude" data-key="${esc(ticket.key)}" title="${esc(title)}">
    <span class="glyph claude">${G.claude}</span><span class="label">${label}</span></button>`
  if (ticket.terminal && !ticket.terminal.exited) {
    const [color, label] = s ? sessionLook(s) : ['purple', 'Starting']
    return chip(color, label, [s && sessionTitle(s, ticket.key), 'Open this session'].filter(Boolean).join('\n'))
  }
  if (s) {
    const [color, label] = sessionLook(s)
    const where = `Runs in ${ui.state.terminal.name}${ui.state.terminal.switching ? ': switch to it' : ''}`
    return chip(color, label, [sessionTitle(s, ticket.key), where].filter(Boolean).join('\n'))
  }
  if (ticket.previous) {
    const title = withoutKey(ticket.previous.title || ticket.previous.prompt, ticket.key)
    return chip('', 'Resume', [title, `Last active ${ago(ticket.previous.updated)}. Resume it in Atelier`].filter(Boolean).join('\n'))
  }
  return chip('', 'Start session', `Start a Claude session on ${ticket.key} in Atelier`)
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

function timeCell(ticket) {
  const t = ticket.time
  const running = Boolean(t.runningSince)
  const totals = [
    t.today ? `<span><span class="code">${duration(t.today)}</span> today</span>` : '',
    ticket.timeSpent ? `<span><span class="code">${duration(ticket.timeSpent)}</span> in all</span>` : ''
  ].join('')
  return `<div class="time">
    <span class="totals">${totals}</span>
    ${running
      ? `<button class="play running" data-act="timer-stop" title="Stop the timer"><span class="glyph">${G.stop}</span><span class="code" data-since="${t.runningSince}">${clockText(Date.now() - t.runningSince + t.unlogged * 1000)}</span></button>`
      : `<button class="play" data-act="timer-start" data-key="${esc(ticket.key)}" title="Start a timer on ${esc(ticket.key)}"><span class="glyph">${G.play}</span>${t.unlogged ? `<span class="code unlogged">${duration(t.unlogged)}</span>` : '<span class="t">Track</span>'}</button>`}
    <button class="play add-time" data-act="ask-manual-time" data-key="${esc(ticket.key)}" title="Log time on ${esc(ticket.key)} by hand" aria-label="Log time on ${esc(ticket.key)} by hand"><span class="glyph">${G.plus}</span><span class="t">Add time</span></button>
  </div>`
}

function manualForm(key, scope = '') {
  const draft = ui.drafts[`manual:${key}`] ?? ''
  const parsed = parseDuration(draft)
  const valid = parsed >= 60 && parsed <= 86400
  const busy = ui.busy.has(`log:${key}`)
  const id = `manual${scope ? `-${scope}` : ''}-${esc(key)}`
  return `<form class="confirm" data-form="manual-log" data-key="${esc(key)}">
    <label class="question" for="${id}">Add time on <strong class="code">${esc(key)}</strong></label>
    <input id="${id}" data-draft="manual:${esc(key)}" value="${esc(draft)}" placeholder="1h 30m" autocomplete="off" spellcheck="false" aria-describedby="hint-${id}">
    <input type="date" class="date" data-manual-date="${esc(key)}" value="${esc(ui.confirm.date)}" max="${localDay()}" required aria-label="Day">
    <button class="btn primary" type="submit" ${valid && !busy ? '' : 'disabled'}>${busy ? 'Logging…' : 'Log time'}</button>
    <button class="btn quiet" type="button" data-act="cancel">Cancel</button>
    <span class="${!draft || valid ? 'hint' : 'invalid'}" id="hint-${id}">${valid ? `That logs ${duration(parsed)}.` : !draft ? 'Formats: 1h, 1.5h, 15m, 1h 30m' : 'Use a duration such as 1h, 1.5h, 15m or 1h 30m'}</span>
  </form>`
}

function editForm(entry) {
  const draft = ui.drafts[`edit:${entry.id}`] ?? duration(entry.seconds)
  const parsed = parseDuration(draft)
  const valid = parsed >= 60 && parsed <= 86400
  const busy = ui.busy.has(`log:${entry.key}`)
  const id = `edit-${esc(entry.id)}`
  return `<form class="confirm" data-form="edit-log" data-key="${esc(entry.key)}" data-id="${esc(entry.id)}">
    <label class="question" for="${id}">Change the time on <strong class="code">${esc(entry.key)}</strong></label>
    <input id="${id}" data-draft="edit:${esc(entry.id)}" value="${esc(draft)}" autocomplete="off" spellcheck="false" aria-describedby="hint-${id}">
    <button class="btn primary" type="submit" ${valid && !busy ? '' : 'disabled'}>${busy ? 'Saving…' : 'Save'}</button>
    <button class="btn quiet" type="button" data-act="cancel">Cancel</button>
    <span class="${valid ? 'hint' : 'invalid'}" id="hint-${id}">${valid ? `That makes ${duration(parsed)}.` : 'Use a duration such as 1h, 1.5h, 15m or 1h 30m'}</span>
  </form>`
}

const TICKET_KEY = /^[A-Z][A-Z0-9]+-\d+$/

function newTimeValid() {
  const seconds = parseDuration(ui.drafts['manual:new'] ?? '')
  return TICKET_KEY.test((ui.drafts['new-key'] ?? '').trim().toUpperCase()) && seconds >= 60 && seconds <= 86400 && Boolean(ui.confirm?.date)
}

function newTimeForm() {
  const key = ui.drafts['new-key'] ?? ''
  const draft = ui.drafts['manual:new'] ?? ''
  const parsed = parseDuration(draft)
  const durationValid = parsed >= 60 && parsed <= 86400
  const keyValid = TICKET_KEY.test(key.trim().toUpperCase())
  const busy = ui.busy.has('log:new')
  const hint = !key && !draft ? 'Ticket such as TOAST-1234. Time formats: 1h, 1.5h, 15m, 1h 30m'
    : key && !keyValid ? 'Use a ticket number such as TOAST-1234'
    : draft && !durationValid ? 'Use a duration such as 1h, 1.5h, 15m or 1h 30m'
    : durationValid ? `That logs ${duration(parsed)}.` : ''
  const bad = (key && !keyValid) || (draft && !durationValid)
  return `<form class="confirm" data-form="new-log">
    <label class="question" for="new-key">Add time on</label>
    <input id="new-key" class="ticket-key" data-new-key value="${esc(key)}" placeholder="TOAST-1234" autocomplete="off" spellcheck="false" aria-describedby="hint-new">
    <input data-draft="manual:new" value="${esc(draft)}" placeholder="1h 30m" autocomplete="off" spellcheck="false" aria-label="Time spent" aria-describedby="hint-new">
    <input type="date" class="date" data-manual-date="new" value="${esc(ui.confirm.date)}" max="${localDay()}" required aria-label="Day">
    <button class="btn primary" type="submit" ${newTimeValid() && !busy ? '' : 'disabled'}>${busy ? 'Logging…' : 'Log time'}</button>
    <button class="btn quiet" type="button" data-act="cancel">Cancel</button>
    <span class="${bad ? 'invalid' : 'hint'}" id="hint-new">${hint}</span>
  </form>`
}

function deleteConfirm(entry) {
  const busy = ui.busy.has(`log:${entry.key}`)
  return `<div class="confirm">
    <span class="question">Delete the <strong class="code">${duration(entry.seconds)}</strong> logged on <strong class="code">${esc(entry.key)}</strong> at ${esc(entry.time)}? This removes it from Jira.</span>
    <button class="btn primary" data-act="delete-time" data-id="${esc(entry.id)}" data-key="${esc(entry.key)}" ${busy ? 'disabled' : ''}>${busy ? 'Deleting…' : 'Delete'}</button>
    <button class="btn quiet" data-act="cancel">Cancel</button>
  </div>`
}

function renderTime(state) {
  const time = state.time
  const entries = time?.entries || []
  const parts = [`<div class="pane-head">
    <h2 id="time-title">My time entry <span class="count">${entries.length || ''}</span></h2>
    <button class="btn" data-act="ask-new-time" title="Log time on a ticket that is not in the list"><span class="glyph">${G.plus}</span><span class="t">Add time on a ticket</span></button>
  </div>`]
  if (ui.confirm?.type === 'new-time') parts.push(newTimeForm())
  if (state.errors.time) parts.push(`<p class="notice">Jira did not answer: ${esc(state.errors.time)}. Refresh once it is back.</p>`)
  if (!entries.length) {
    parts.push(`<p class="empty">${state.loading.time && !time ? 'Loading your time entries…' : 'Nothing logged today yet.'}</p>`)
  } else {
    parts.push(`<p class="repos"><span class="code">${duration(time.today)}</span> logged today, oldest first</p>`)
    parts.push(entries.map(entry => {
      const editing = ui.confirm?.type === 'edit-time' && ui.confirm.id === entry.id
      const adding = ui.confirm?.type === 'manual-time' && ui.confirm.scope === 'time' && ui.confirm.key === entry.key && ui.confirm.entry === entry.id
      const deleting = ui.confirm?.type === 'delete-time' && ui.confirm.id === entry.id
      return `<article class="time-entry" data-entry="${esc(entry.id)}">
        <div class="head">
          <span class="at code">${esc(entry.time)}</span>
          <button class="key code" data-act="open-url" data-url="${esc(entry.url)}" title="Open ${esc(entry.key)} in Jira">${esc(entry.key)}</button>
          <span class="summary" title="${esc(entry.summary)}">${esc(entry.summary)}</span>
          <span class="spent code">${duration(entry.seconds)}</span>
          <button class="play" data-act="ask-edit-time" data-id="${esc(entry.id)}" data-key="${esc(entry.key)}" title="Change this time entry" aria-label="Change the time entry of ${esc(entry.key)}"><span class="glyph">${G.edit}</span><span class="t">Edit</span></button>
          <button class="play add-time" data-act="ask-manual-time" data-scope="time" data-entry="${esc(entry.id)}" data-key="${esc(entry.key)}" title="Add time on ${esc(entry.key)}" aria-label="Add time on ${esc(entry.key)}"><span class="glyph">${G.plus}</span><span class="t">Add time</span></button>
          <button class="play delete-time" data-act="ask-delete-time" data-id="${esc(entry.id)}" data-key="${esc(entry.key)}" title="Delete this time entry" aria-label="Delete the time entry of ${esc(entry.key)}"><span class="glyph">${G.trash}</span><span class="t">Delete</span></button>
        </div>
        ${editing ? editForm(entry) : adding ? manualForm(entry.key, 'time') : deleting ? deleteConfirm(entry) : ''}
      </article>`
    }).join(''))
  }
  $('time').innerHTML = parts.join('')
}

function rebaseChip(ticket) {
  const pr = ticket.rebasable
  if (!pr) return ''
  if (ticket.rebase) {
    const [color, label] = ticket.rebase.session ? sessionLook(ticket.rebase.session) : ['purple', 'Starting']
    return `<button class="chip rebase-chip ${color}" data-act="open-session" data-id="${esc(ticket.rebase.id)}" title="Open the Claude session resolving the rebase of #${pr.number}">
      <span class="glyph">${G.rebase}</span><span class="label">Rebase: ${esc(label)}</span></button>`
  }
  const busy = ui.busy.has(`rebase:${ticket.key}`)
  const conflicting = pr.mergeable === 'CONFLICTING'
  return `<button class="chip rebase-chip ${conflicting ? 'red' : ''}" data-act="ask-rebase" data-key="${esc(ticket.key)}" ${busy ? 'disabled' : ''}
    title="Rebase #${pr.number} onto origin/${esc(pr.base)} in a separate worktree. Conflicts go to a Claude session">
    <span class="glyph">${G.rebase}</span><span class="label">${busy ? 'Rebasing…' : 'Rebase'}</span></button>`
}

function confirmRow(ticket, columns) {
  if (ui.confirm?.type === 'rebase' && ui.confirm.key === ticket.key && ticket.rebasable) {
    const pr = ticket.rebasable
    const busy = ui.busy.has(`rebase:${ticket.key}`)
    return `<div class="confirm">
      <span class="question">Rebase <strong class="code">#${pr.number}</strong> onto <strong class="code">origin/${esc(pr.base)}</strong> and force-push <span class="code">${esc(pr.branch)}</span>? On conflicts, Claude resolves them in a worktree and asks you before pushing.</span>
      <button class="btn primary" data-act="rebase" data-key="${esc(ticket.key)}" ${busy ? 'disabled' : ''}>${busy ? 'Rebasing…' : 'Rebase and push'}</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>`
  }
  if (ui.confirm?.type === 'move' && ui.confirm.key === ticket.key) {
    const to = columns[ui.confirm.station]
    const busy = ui.busy.has(`move:${ticket.key}`)
    return `<div class="confirm">
      <span class="question">Move <strong class="code">${esc(ticket.key)}</strong> from ${esc(ticket.column)} to <strong>${esc(to)}</strong>?</span>
      <button class="btn primary" data-act="move" data-key="${esc(ticket.key)}" ${busy ? 'disabled' : ''}>${busy ? 'Moving…' : 'Move'}</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>`
  }
  if (ui.confirm?.type === 'manual-time' && ui.confirm.key === ticket.key && !ui.confirm.scope) return manualForm(ticket.key)
  const t = ticket.time
  if (t.unlogged > 0 && !t.runningSince) {
    const draft = ui.drafts[ticket.key] ?? duration(roundedForLog(t.unlogged))
    const parsed = parseDuration(draft)
    const valid = parsed >= 60 && parsed <= 86400
    const busy = ui.busy.has(`log:${ticket.key}`)
    return `<form class="confirm" data-form="log" data-key="${esc(ticket.key)}">
      <label class="question" for="log-${esc(ticket.key)}">Log on <strong class="code">${esc(ticket.key)}</strong> for today</label>
      <input id="log-${esc(ticket.key)}" data-draft="${esc(ticket.key)}" value="${esc(draft)}" autocomplete="off" spellcheck="false" aria-describedby="hint-${esc(ticket.key)}">
      <button class="btn primary" type="submit" ${valid && !busy ? '' : 'disabled'}>${busy ? 'Logging…' : 'Log time'}</button>
      <button class="btn quiet" type="button" data-act="timer-discard" data-key="${esc(ticket.key)}">Discard</button>
      <span class="${valid ? 'hint' : 'invalid'}" id="hint-${esc(ticket.key)}">${valid ? `Tracked ${duration(t.unlogged)}. Formats: 1h15, 45m, 1.5` : 'Use a duration such as 1h15, 45m or 1.5'}</span>
    </form>`
  }
  return ''
}

function ticketRow(ticket, columns) {
  const classes = ['ticket']
  if (['orange', 'green'].includes(ticket.tone)) classes.push(`tone-${ticket.tone}`)
  if (ticket.blocked) classes.push('blocked')
  else if (ticket.attention) classes.push('attention')
  else if (ticket.session?.status === 'working') classes.push('working')
  const flagBusy = ui.busy.has(`flag:${ticket.key}`)
  const fresh = (ticket.session || ticket.previous) && !(ticket.terminal && !ticket.terminal.exited)
    ? `<button class="new-session" data-act="claude-new" data-key="${esc(ticket.key)}" title="Start a new Claude session on ${esc(ticket.key)}" aria-label="Start a new Claude session on ${esc(ticket.key)}"><span class="glyph">${G.plus}</span></button>`
    : ''
  return `<article class="${classes.join(' ')}" data-ticket="${esc(ticket.key)}">
    <div class="head">
      <button class="key code" data-act="open-url" data-url="${esc(ticket.url)}" title="Open ${esc(ticket.key)} in Jira">${esc(ticket.key)}</button>
      <span class="summary" title="${esc(ticket.summary)}">${esc(ticket.summary)}</span>
      ${runTag(ticket)}
      ${ticket.verification ? `<span class="verification" title="Vérification: ${esc(ticket.verification)}">${esc(ticket.verification)}</span>` : ''}
      <span class="type">${esc(ticket.type)}</span>
      ${timeCell(ticket)}
    </div>
    <div class="body">
      ${track(ticket, columns)}
      <span class="column" title="${esc(ticket.blocked ? `Blocked in ${ticket.column}` : ticket.column)}">${esc(ticket.column)}</span>
      <span class="claude-cell">${claudeChip(ticket)}${fresh}</span>
      ${ticket.pr ? prChip(ticket.pr) : '<span class="no-pr">No pull request yet</span>'}
      ${ticket.otherPrs.filter(p => p.state === 'OPEN').map(prChip).join('')}
      ${rebaseChip(ticket)}
      <button class="flag ${ticket.blocked ? 'on' : ''}" data-act="flag" data-key="${esc(ticket.key)}" data-blocked="${ticket.blocked ? 0 : 1}" ${flagBusy ? 'disabled' : ''}
        title="${ticket.blocked ? 'Remove the blocked flag in Jira' : 'Flag this ticket as blocked in Jira'}">
        <span class="glyph">${G.flag}</span><span class="${ticket.blocked ? 't' : 'flag-text'}">${ticket.blocked ? 'Blocked' : 'Flag as blocked'}</span>
      </button>
    </div>
    ${confirmRow(ticket, columns)}
  </article>`
}

/* Workflow runs */

const LIVE_RUN = ['starting', 'running', 'waiting']

function runLook(run) {
  return {
    starting: ['purple', 'Starting'],
    running: ['purple', 'Running'],
    waiting: ['sand', 'Needs you'],
    done: ['green', 'Done'],
    skipped: ['', 'Skipped'],
    failed: ['red', 'Failed'],
    ended: ['', 'Ended']
  }[run.status] || ['', run.status]
}

function runTag(ticket) {
  if (!ticket.run) return ''
  const [color, label] = runLook(ticket.run)
  return `<span class="run-tag ${color}" title="${esc(`Taken by the ${ticket.run.label} workflow: ${label}`)}"><span class="glyph">${G.workflow}</span>Workflow</span>`
}

function runPr(state, run) {
  if (!run.pr) return ''
  const pr = [...state.tickets.flatMap(t => [t.pr, ...t.otherPrs]), ...state.loosePrs].find(p => p?.url === run.pr)
  if (pr) return prChip(pr)
  const number = run.pr.match(/\/pull\/(\d+)/)?.[1]
  return `<button class="chip pr-chip" data-act="open-url" data-url="${esc(run.pr)}" title="Open the pull request on GitHub">
    <span class="glyph">${G.draft}</span><span class="label">Pull request</span>${number ? `<span class="code">#${number}</span>` : ''}</button>`
}

function runQuestion(run) {
  if (!run.question) return ''
  const busy = ui.busy.has(`run:${run.id}`)
  return `<div class="confirm run-question">
    <span class="question">${esc(run.question.text)}</span>
    ${run.question.options.map((option, i) => `<button class="btn ${i ? 'quiet' : 'primary'}" data-act="run-answer" data-id="${esc(run.id)}" data-option="${esc(option)}" ${busy || !run.open ? 'disabled' : ''}>${esc(option)}</button>`).join('')}
  </div>`
}

function runCard(state, run) {
  const [color, label] = runLook(run)
  const live = LIVE_RUN.includes(run.status)
  const ticket = run.ticket && [...state.tickets, ...state.unassigned].find(t => t.key === run.ticket)
  const since = run.stageSince || run.startedAt
  const line = live ? run.stage || 'Starting Claude…' : run.message || run.stage || ''
  return `<article class="run ${live ? 'live' : ''}" data-run="${esc(run.id)}">
    <div class="run-head">
      <span class="glyph">${G.workflow}</span>
      <h3>${esc(run.label)}</h3>
      <span class="chip ${color}"><span class="label">${esc(label)}</span></span>
      ${run.ticket ? ticket ? `<button class="key code" data-act="open-url" data-url="${esc(ticket.url)}" title="${esc(ticket.summary)}">${esc(run.ticket)}</button>` : `<span class="key code">${esc(run.ticket)}</span>` : ''}
      ${runPr(state, run)}
      <span class="run-actions">
        ${run.session && !run.running ? `<button class="btn quiet" data-act="run-resume" data-id="${esc(run.id)}" title="Resume this run's Claude session in Atelier" ${ui.busy.has(`run:${run.id}`) ? 'disabled' : ''}><span class="glyph">${G.terminal}</span><span class="t">Resume the session</span></button>`
          : run.open ? `<button class="btn quiet" data-act="open-session" data-id="${esc(run.terminal)}"><span class="glyph">${G.terminal}</span><span class="t">Open the session</span></button>` : ''}
        ${live ? '' : `<button class="unassign" data-act="run-dismiss" data-id="${esc(run.id)}" title="Remove this run from the list" aria-label="Remove this run from the list"><span class="glyph">${G.cross}</span></button>`}
      </span>
    </div>
    ${line ? `<p class="run-stage">${live ? `<span class="code" data-since="${since}">${clockText(Date.now() - since)}</span>` : `<span class="meta">${ago(run.finishedAt || run.updated || run.startedAt)}</span>`}<span>${esc(line)}</span></p>` : ''}
    ${runQuestion(run)}
  </article>`
}

function runList(state) {
  const shown = state.runs.filter(run => !run.dismissed)
  if (!shown.length) return ''
  return `${shown.map(run => runCard(state, run)).join('')}<h3>Tickets</h3>`
}

/* Panes */

const THEMES = [
  { id: 'default', label: 'Atelier', swatches: ['#212337', '#282a42', '#9b90f4', '#8acfef', '#13be76', '#e8c59b', '#f97171'] },
  { id: 'nord', label: 'Nord', swatches: ['#2e3440', '#3b4252', '#81a1c1', '#88c0d0', '#a3be8c', '#ebcb8b', '#bf616a'] },
  { id: 'light', label: 'Light', swatches: ['#f4f5f9', '#ffffff', '#5b4fd1', '#1d7fa3', '#0b8a55', '#9a6b1c', '#c93a3a'] },
  { id: 'latte', label: 'Catppuccin Latte', swatches: ['#eff1f5', '#ffffff', '#8839ef', '#209fb5', '#40a02b', '#df8e1d', '#d20f39'] },
  { id: 'frappe', label: 'Catppuccin Frappé', swatches: ['#303446', '#363a4d', '#ca9ee6', '#99d1db', '#a6d189', '#e5c890', '#e78284'] },
  { id: 'macchiato', label: 'Catppuccin Macchiato', swatches: ['#24273a', '#2a2e41', '#c6a0f6', '#91d7e3', '#a6da95', '#eed49f', '#ed8796'] },
  { id: 'mocha', label: 'Catppuccin Mocha', swatches: ['#1e1e2e', '#252536', '#cba6f7', '#89dceb', '#a6e3a1', '#f9e2af', '#f38ba8'] },
  { id: 'dracula', label: 'Dracula', swatches: ['#282a36', '#323443', '#bd93f9', '#8be9fd', '#50fa7b', '#f1fa8c', '#ff5555'] }
]

function renderSettings(state) {
  const section = ui.settingsTab
  $('settings').innerHTML = `<h2 id="settings-title">Settings</h2>
    <div class="subtabs" role="tablist" aria-label="Settings sections">${SETTINGS_TABS.map(tab => `
      <button role="tab" id="settings-tab-${tab.id}" aria-selected="${tab.id === section}" aria-controls="settings-body" data-act="settings-tab" data-section="${tab.id}">${tab.label}</button>`).join('')}
    </div>
    <div id="settings-body" role="tabpanel" aria-labelledby="settings-tab-${section}">${(SETTINGS_TABS.find(tab => tab.id === section) || SETTINGS_TABS[0]).render(state)}</div>`
}

const SETTINGS_TABS = [
  { id: 'global', label: 'Global', render: state => globalSettings(state) },
  { id: 'tickets', label: 'Tickets', render: state => jiraSettings(state) },
  { id: 'qualifs', label: 'Qualifs', render: state => qualifSettings(state) }
]

function globalSettings(state) {
  const current = document.documentElement.dataset.theme || 'default'
  return `<h3>Theme</h3>
    <div class="themes" role="radiogroup" aria-label="Theme">${THEMES.map(theme => `
      <button class="theme-option" role="radio" aria-checked="${theme.id === current}" data-act="set-theme" data-theme="${theme.id}">
        <span class="swatches" aria-hidden="true">${theme.swatches.map(color => `<i style="background: ${color}"></i>`).join('')}</span>
        <span class="t">${esc(theme.label)}</span>
      </button>`).join('')}
    </div>
    <h3>Editor</h3>
    <div class="editors" role="radiogroup" aria-label="Editor">${state.editors.map(editor => `
      <button class="editor-option" role="radio" aria-checked="${editor.current}" data-act="set-editor" data-command="${esc(editor.command)}">
        <span class="t">${esc(editor.name)}</span>
        <span class="hint">${editor.mode === 'window' ? 'Opens its own window' : 'Opens in a pane beside Claude'}</span>
        ${editor.custom ? '<span class="hint">Set in config.json</span>' : ''}
        ${editor.found ? '' : `<span class="hint missing">${esc(editor.command)} not found</span>`}
      </button>`).join('')}
    </div>
    <h3>Repositories</h3>
    <div class="dev-dir">
      <span class="code path">${esc(state.devDir)}</span>
      <button class="btn" data-act="choose-dev-dir" ${ui.busy.has('choose-dev-dir') ? 'disabled' : ''}><span class="glyph">${G.folder}</span><span class="t">Change</span></button>
      <span class="hint">${state.reposPinned ? 'Not used: "repos" in config.json lists the repositories'
        : state.repos.length ? `${state.repos.length} ${state.repos.length === 1 ? 'repository' : 'repositories'}, each a folder right inside it with a .git or .sl directory`
        : 'No repository: Atelier looks for folders right inside it with a .git or .sl directory'}</span>
    </div>`
}

function qualifField({ field, label, value, placeholder = '', hint = '', type = 'text' }) {
  return `<label class="setting-field"><span class="t">${esc(label)}</span>
    <input type="${type}" data-qualif-field="${field}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" ${type === 'number' ? 'min="1" max="99"' : ''} autocomplete="off" spellcheck="false">
    ${hint ? `<span class="hint">${hint}</span>` : ''}</label>`
}

function qualifJiraField(settings, connected) {
  const current = settings.values.jiraField
  const fields = settings.fields || []
  const known = !current || fields.some(field => field.id === current)
  return `<label class="setting-field"><span class="t">Jira field</span>
    <select data-qualif-field="jiraField" ${connected && settings.fields ? '' : 'disabled'}>
      <option value="">None</option>
      ${known ? '' : `<option value="${esc(current)}" selected>${esc(current)}</option>`}
      ${fields.map(field => `<option value="${esc(field.id)}" ${field.id === current ? 'selected' : ''}>${esc(field.name)}</option>`).join('')}
    </select>
    <span class="hint">${connected ? 'A select field whose options name the qualif number. Atelier shows it on the tickets and sets it after a deploy' : 'Connect Jira to pick it'}</span></label>`
}

function qualifSettings(state) {
  const settings = state.qualifSettings
  const v = settings.values
  const parts = [`<h3>Qualifs</h3>
    <label class="setting-row toggle">
      <input type="checkbox" data-pick="qualif-enabled" ${settings.enabled ? 'checked' : ''}>
      <span>Show the ${esc(v.label)}s tab: test environments that each get a branch rebuilt from a base branch plus the pull requests of their tickets</span>
    </label>`]
  if (!settings.enabled) return parts.join('')
  parts.push(`<div class="setting-fields">
    ${qualifField({ field: 'label', label: 'Name', value: v.label, placeholder: 'Qualif' })}
    ${qualifField({ field: 'count', label: 'How many', value: v.count, type: 'number', hint: 'Numbered from 1' })}
    ${qualifField({ field: 'url', label: 'Page', value: v.url, placeholder: 'https://qualif{n}.example.com', hint: '<span class="code">{n}</span> becomes the number' })}
    ${qualifField({ field: 'base', label: 'Base branch', value: v.base, placeholder: 'main' })}
    ${qualifField({ field: 'branch', label: 'Branch', value: v.branch, placeholder: 'qualif-{login}-{n}', hint: 'Force-pushed on each sync. <span class="code">{login}</span> becomes your GitHub login' })}
    ${qualifField({ field: 'repo', label: 'GitHub repository', value: v.repo, placeholder: settings.defaultRepo })}
    ${qualifField({ field: 'workflow', label: 'Deploy workflow', value: v.workflow, placeholder: 'deploy.yml', hint: 'Run on the pushed branch. Without it, Sync only pushes' })}
    <label class="setting-field"><span class="t">Workflow inputs</span>
      <textarea data-qualif-field="inputs" rows="2" placeholder="environment=qualif{n}" spellcheck="false">${esc(v.inputs)}</textarea>
      <span class="hint">One <span class="code">name=value</span> per line</span></label>
    ${qualifJiraField(settings, state.jira.connected)}
  </div>
  <div class="setting-row cache-commands"><span class="t">Clear the cache</span>
    ${settings.cache.length ? settings.cache.map(command => `<span class="code">${esc(command)}</span>`).join('') : '<span>Not set up</span>'}
    <span class="hint">The commands come from <span class="code">qualif.cache</span> in config.json</span>
  </div>`)
  return parts.join('')
}

function columnPicks(columns, checked, attrs, taken = new Map()) {
  return `<div class="column-picks">${columns.map(column => {
    const owner = taken.get(column.id)
    return `<label class="column-pick" ${owner ? `title="Already in ${esc(owner)}"` : ''}>
      <input type="checkbox" ${attrs} data-column="${esc(column.id)}" ${checked.includes(column.id) ? 'checked' : ''} ${owner ? 'disabled' : ''}>
      <span>${esc(column.name)}</span>${owner ? `<span class="hint">in ${esc(owner)}</span>` : ''}</label>`
  }).join('')}</div>`
}

function jiraBoard(jira, loading) {
  if (!jira.connected) return '<p class="setting-hint">Connect Jira to pick a board and the columns Atelier uses.</p>'
  if (!jira.boards) return `<p class="setting-hint">${loading ? 'Loading your boards…' : 'Jira did not list your boards. Refresh to try again.'}</p>`
  if (!jira.boards.length) return '<p class="setting-hint">Your Jira account sees no board.</p>'
  if (jira.boards.length === 1) {
    const board = jira.boards[0]
    return `<div class="setting-row"><span class="t">Board</span><span>${esc(board.name)}${board.project ? ` <span class="meta code">(${esc(board.project)})</span>` : ''}</span><span class="hint">The only board your account sees</span></div>`
  }
  return `<label class="setting-row" for="jira-board"><span class="t">Board</span>
    <select id="jira-board" data-pick="jira-board">${jira.boardId ? '' : '<option value="" selected>Pick a board</option>'}${jira.boards.map(board => `
      <option value="${board.id}" ${board.id === jira.boardId ? 'selected' : ''}>${esc(board.name)}${board.project ? ` (${esc(board.project)})` : ''}</option>`).join('')}
    </select></label>`
}

function jiraColumns(jira, loading) {
  if (!jira.connected || !jira.boardId) return ''
  if (!jira.columns.length) return `<p class="setting-hint">${loading ? 'Loading the board columns…' : 'The board shows no column.'}</p>`
  const owners = jira.filters.flatMap((filter, index) => filter.columns.map(column => [column, index]))
  const filtered = new Map(owners.map(([column, owner]) => [column, jira.filters[owner].label]))
  const mine = jira.columns.filter(c => !filtered.has(c.id)).map(c => c.id)
  return `<h3>My tickets</h3>
    <p class="setting-hint">Your tickets in these columns show under My tickets. Columns in a filter show there instead.</p>
    ${columnPicks(jira.columns, jira.mineColumns || mine, 'data-pick="mine-column"', filtered)}
    <h3>Unassigned</h3>
    <p class="setting-hint">Unassigned tickets in these columns show under Unassigned. Check none to hide the tab.</p>
    ${columnPicks(jira.columns, jira.unassignedColumns, 'data-pick="unassigned-column"')}
    <h3>Filters</h3>
    <p class="setting-hint">Each filter is a tab under My tickets. Your tickets in its columns show there instead of in My tickets.</p>
    ${jira.filters.map((filter, index) => {
      const taken = new Map(owners.filter(([, owner]) => owner !== index).map(([column, owner]) => [column, jira.filters[owner].label]))
      return `<div class="filter-edit">
        <div class="filter-head">
          <input class="filter-name" data-filter-label="${index}" value="${esc(filter.label)}" aria-label="Filter name" spellcheck="false">
          <button class="btn quiet" data-act="filter-remove" data-index="${index}" title="Remove the ${esc(filter.label)} filter"><span class="glyph">${G.cross}</span><span class="t">Remove</span></button>
        </div>
        ${columnPicks(jira.columns, filter.columns, `data-pick="filter-column" data-index="${index}"`, taken)}
      </div>`
    }).join('')}
    <div class="setting-row"><button class="btn" data-act="filter-add"><span class="glyph">${G.plus}</span><span class="t">Add a filter</span></button></div>`
}

function jiraSettings(state) {
  const jira = state.jira
  const draft = ui.jiraDraft
  const busy = ui.busy.has('jira-connect')
  return `<h3>Jira</h3>
    <form class="jira-form" data-form="jira">
      <label><span class="t">Site</span><input data-jira="base" value="${esc(draft.base ?? jira.base)}" placeholder="https://your-team.atlassian.net" autocomplete="off" spellcheck="false"></label>
      <label><span class="t">E-mail</span><input data-jira="email" type="email" value="${esc(draft.email ?? jira.email)}" autocomplete="off" spellcheck="false"></label>
      <label><span class="t">API token</span><input data-jira="token" type="password" value="${esc(draft.token ?? '')}" placeholder="${jira.email ? 'Saved, leave empty to keep it' : 'Create one on id.atlassian.com'}" autocomplete="off"></label>
      <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Connecting…' : jira.connected ? 'Save' : 'Connect'}</button>
      <span class="hint">${jira.legacyFile ? `Atelier reads the e-mail and token from <span class="code">${esc(jira.legacyFile)}</span> for now. ${jira.connected ? 'Save' : 'Connect'} to keep them in <span class="code">${esc(jira.file)}</span> instead, readable only by you.`
        : `${jira.connected ? 'Connected. ' : ''}The e-mail and token stay in <span class="code">${esc(jira.file)}</span>, readable only by you. Time tracking reads them from there too.`}</span>
    </form>
    ${jiraBoard(jira, state.loading.jira)}
    ${jiraColumns(jira, state.loading.jira)}`
}


const ticketsIn = (state, stage) => state.tickets.filter(t => t.stage === stage)

function ticketList(tickets, columns) {
  const blocked = tickets.filter(t => t.blocked)
  const parts = [tickets.filter(t => !t.blocked).map(t => ticketRow(t, columns)).join('')]
  if (blocked.length) parts.push(`<h3>Blocked <span class="count">${blocked.length}</span></h3>`, blocked.map(t => ticketRow(t, columns)).join(''))
  return parts.join('')
}

function renderLaunch(state) {
  const active = document.activeElement
  if (active?.tagName === 'SELECT' && $('launch').contains(active)) return
  if (!state.repos.length) {
    $('launch').innerHTML = `
      <p class="launch-empty">No repository in <span class="code">${esc(state.devDir)}</span></p>
      <button class="btn launch-claude" data-act="choose-dev-dir" title="Pick the folder that holds your repositories"><span class="glyph">${G.folder}</span><span class="t">Choose the folder</span></button>`
    return
  }
  const repo = state.repos.includes(ui.repo) ? ui.repo : state.repos[0]
  const starting = ui.busy.has('sl-web')
  $('launch').innerHTML = `
    <label class="repo" for="repo-pick" title="Where new sessions, terminals and ${esc(state.editor.name)} open">
      <span class="glyph">${G.folder}</span>
      <select id="repo-pick" data-pick="repo">${state.repos.map(name => `<option ${name === repo ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
    </label>
    <button class="btn primary launch-claude" data-act="claude-repo" title="Start a Claude session with no ticket in ${esc(repo)}"><span class="glyph claude">${G.claude}</span><span class="t">New Claude session</span></button>
    <div class="launch-tools">
      <button class="tool" data-act="shell-repo" title="Open a plain terminal, without Claude, in ${esc(repo)}"><span class="glyph">${G.terminal}</span><span class="t">Terminal</span></button>
      <button class="tool" data-act="editor-repo" title="Open ${esc(state.editor.name)} in ${esc(repo)}"><span class="glyph">${G.edit}</span><span class="t">${esc(state.editor.name)}</span></button>
      ${state.sapling ? `<button class="tool" data-act="sl-web" title="Show Sapling Web (sl web) on ${esc(repo)} inside Atelier" ${starting ? 'disabled' : ''}><span class="glyph">${G.smartlog}</span><span class="t">${starting ? 'Starting…' : 'sl web'}</span></button>` : ''}
    </div>
    ${state.workflows.length ? `<div class="launch-workflows">${state.workflows.map(w => {
      const live = state.runs.some(run => run.workflow === w.id && LIVE_RUN.includes(run.status))
      return `<button class="tool" data-act="workflow-run" data-id="${esc(w.id)}" title="${esc(live ? `Open the running ${w.label}` : w.description || `Start ${w.label}`)}">
        <span class="glyph">${G.workflow}</span><span class="t">${esc(w.label)}</span>${live ? '<span class="state">Running</span>' : ''}</button>`
    }).join('')}</div>` : ''}`
}

const navItems = state => [
  { tab: 'time', label: 'My time entry', glyph: 'clock' },
  { tab: 'mine', label: 'My tickets', glyph: 'list' },
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
  $('tabs').innerHTML = navItems(ui.state).map(item => {
    const current = listing && ui.tab === item.tab
    const count = navCount(ui.state, item.tab)
    return `<button data-tab="${item.tab}" class="${item.sub ? 'sub' : ''}" aria-current="${current ? 'page' : 'false'}" title="${esc(item.label)}">
      <span class="glyph">${G[item.glyph]}</span><span class="t">${esc(item.label)}</span><span class="count code">${count || ''}</span></button>`
  }).join('')
}

function renderMine(state) {
  const mine = ticketsIn(state, 'mine')
  const parts = [`<h2 id="mine-title">My tickets <span class="count">${mine.length || ''}</span></h2>`]
  if (!state.jira.connected) parts.push('<p class="notice">Connect Jira under <button class="link" data-act="go-settings">Settings</button> to see your tickets.</p>')
  else if (state.errors.jira) parts.push(`<p class="notice">Jira did not answer: ${esc(state.errors.jira)}. Check the Jira part of <button class="link" data-act="go-settings">Settings</button>, then refresh.</p>`)
  else if (state.jira.boards?.length > 1 && !state.jira.boardId) parts.push('<p class="notice">Pick your board under <button class="link" data-act="go-settings">Settings</button> to sort your tickets by column.</p>')
  if (state.errors.github) parts.push(`<p class="notice">GitHub did not answer: ${esc(state.errors.github)}. Run <span class="code">gh auth status</span> in a terminal, then refresh.</p>`)
  if (!mine.length) {
    parts.push(`<p class="empty">${state.loading.jira ? 'Loading your Jira tickets…' : state.tickets.length ? 'Your other tickets wait for a release.' : 'Nothing is assigned to you outside Done.'}</p>`)
  }
  parts.push(runList(state))
  parts.push(ticketList(mine, state.columns))

  if (state.loosePrs.length) {
    parts.push(`<h3>Pull requests without a ticket <span class="count">${state.loosePrs.length}</span></h3>`)
    parts.push(state.loosePrs.map(pr => {
      const [color, glyph, label] = prLook(pr)
      return `<div class="row">
        <button class="title" data-act="open-url" data-url="${esc(pr.url)}" title="Open #${pr.number} on GitHub">${esc(pr.title)}</button>
        <span class="chip ${color}"><span class="glyph">${glyph}</span><span class="label">${label}</span><span class="code">#${pr.number}</span>${checks(pr)}</span>
        <span class="meta">${ago(pr.updatedAt)}</span>
      </div>`
    }).join(''))
  }

  const repoTerminals = state.terminals.filter(t => t.role === 'repo' && t.kind === 'claude' && !t.exited)
  const outside = state.looseSessions.filter(s => !s.embedded)
  if (repoTerminals.length || outside.length) {
    parts.push(`<h3>Claude sessions without a ticket <span class="count">${repoTerminals.length + outside.length}</span></h3>`)
    parts.push(repoTerminals.map(t => {
      const [color, label] = t.session ? sessionLook(t.session) : ['purple', 'Starting']
      return `<div class="row">
        <button class="title" data-act="open-session" data-id="${esc(t.id)}" title="Open this session">${esc(t.session?.title || t.session?.first || t.session?.prompt || t.label)}</button>
        <span class="chip ${color}"><span class="glyph claude">${G.claude}</span><span class="label">${label}</span></span>
        <span class="meta code">${esc(t.repo)}</span>
      </div>`
    }).join(''))
    parts.push(outside.map(s => {
      const look = { 'needs-you': ['sand', 'Needs you'], working: ['purple', 'Working'], done: s.seen ? ['idle', 'Finished'] : ['sand', 'Finished, unread'] }[s.status] || ['idle', 'Idle']
      return `<div class="row">
        <button class="title" data-act="focus-session" data-id="${esc(s.id)}" title="Switch to this session's terminal">${esc(s.title || s.prompt || s.project)}</button>
        <span class="chip ${look[0]}"><span class="glyph claude">${G.claude}</span><span class="label">${look[1]}</span></span>
        <span class="meta code">${esc(s.project)}</span>
      </div>`
    }).join(''))
  }

  const shells = state.terminals.filter(t => t.kind === 'terminal' && !t.exited)
  if (shells.length) {
    parts.push(`<h3>Terminals <span class="count">${shells.length}</span></h3>`)
    parts.push(shells.map(t => `<div class="row">
        <button class="title" data-act="open-session" data-id="${esc(t.id)}" title="Open this terminal">${esc(t.label)}</button>
        <span class="chip idle"><span class="glyph">${G.terminal}</span><span class="label">Shell</span></span>
        <span class="meta">${ago(t.startedAt)}</span>
      </div>`).join(''))
  }
  $('mine').innerHTML = parts.join('')
}

function syncFilterPanes(state) {
  const ids = state.filters.map(f => f.id)
  for (const pane of document.querySelectorAll('.pane.filter')) if (!ids.includes(pane.id)) pane.remove()
  for (const id of ids) {
    if ($(id)) continue
    const pane = document.createElement('section')
    pane.className = 'pane filter'
    pane.id = id
    pane.setAttribute('aria-labelledby', `${id}-title`)
    $('unassigned').before(pane)
  }
  if (navItems(state).some(item => item.tab === ui.tab)) markFilterPane()
  else setTab('mine')
}

function renderStage(state, stage, title) {
  const tickets = ticketsIn(state, stage)
  const parts = [`<h2 id="${stage}-title">${esc(title)} <span class="count">${tickets.length || ''}</span></h2>`]
  if (state.errors.jira) parts.push(`<p class="notice">Jira did not answer: ${esc(state.errors.jira)}. Refresh once it is back.</p>`)
  parts.push(tickets.length
    ? ticketList(tickets, state.columns)
    : `<p class="empty">${state.loading.jira ? 'Loading your Jira tickets…' : `None of your tickets is in ${esc(title)}.`}</p>`)
  $(stage).innerHTML = parts.join('')
}

function unassignedRow(ticket, inProgress) {
  const asking = ui.confirm?.type === 'take' && ui.confirm.key === ticket.key
  const busy = ui.busy.has(`take:${ticket.key}`)
  return `<article class="ticket" data-ticket="${esc(ticket.key)}">
    <div class="head">
      <button class="key code" data-act="open-url" data-url="${esc(ticket.url)}" title="Open ${esc(ticket.key)} in Jira">${esc(ticket.key)}</button>
      <span class="summary" title="${esc(ticket.summary)}">${esc(ticket.summary)}</span>
      <span class="type">${esc(ticket.type)}</span>
      <button class="play" data-act="ask-take" data-key="${esc(ticket.key)}" ${busy ? 'disabled' : ''} title="Assign ${esc(ticket.key)} to you and move it to ${esc(inProgress || 'In progress')}">
        <span class="t">${busy ? 'Taking…' : 'Take it'}</span></button>
    </div>
    <div class="body">
      <span class="column">${esc(ticket.column)}</span>
      ${ticket.priority ? `<span class="type">${esc(ticket.priority)}</span>` : ''}
      <span class="type">Updated ${ago(ticket.updated)}</span>
    </div>
    ${asking ? `<div class="confirm">
      <span class="question">Assign <strong class="code">${esc(ticket.key)}</strong> to you and move it from ${esc(ticket.column)} to <strong>${esc(inProgress || 'In progress')}</strong>?</span>
      <button class="btn primary" data-act="take" data-key="${esc(ticket.key)}" ${busy ? 'disabled' : ''}>${busy ? 'Taking…' : 'Take it'}</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>` : ''}
  </article>`
}

function renderUnassigned(state) {
  const tickets = state.unassigned
  const parts = [`<h2 id="unassigned-title">Unassigned <span class="count">${tickets.length || ''}</span></h2>`]
  if (state.errors.jira) parts.push(`<p class="notice">Jira did not answer: ${esc(state.errors.jira)}. Refresh once it is back.</p>`)
  parts.push(tickets.length
    ? tickets.map(t => unassignedRow(t, state.inProgress)).join('')
    : `<p class="empty">${state.loading.jira ? 'Loading the board…' : 'Every open ticket on the board has someone on it.'}</p>`)
  $('unassigned').innerHTML = parts.join('')
}

/* Sapling Web, embedded */

const web = { active: null, frames: new Map() }

function openWeb({ url, repo }) {
  if (document.body.dataset.view === 'session') showList()
  let frame = web.frames.get(repo)
  if (!frame || frame.dataset.url !== url) {
    frame?.remove()
    frame = document.createElement('iframe')
    frame.className = 'web-frame'
    frame.title = `Sapling Web on ${repo}`
    frame.dataset.url = url
    frame.src = url
    $('web-frames').append(frame)
    web.frames.set(repo, frame)
  }
  web.active = repo
  for (const [name, el] of web.frames) el.hidden = name !== repo
  document.body.dataset.view = 'web'
  $('web').hidden = false
  renderNav()
  renderNavSessions()
  $('web-bar').innerHTML = `
    <button class="back" data-act="close-web" title="Back to the list"><span class="glyph">${G.back}</span><span class="t">All tickets</span></button>
    <span class="summary">Sapling Web <span class="code">${esc(repo)}</span></span>
    <button class="btn quiet" data-act="reload-web" title="Reload Sapling Web"><span class="glyph">${G.refresh}</span><span class="t">Reload</span></button>`
  frame.focus()
}

function closeWeb() {
  if (!web.active) return
  web.active = null
  $('web').hidden = true
  if (document.body.dataset.view === 'web') document.body.dataset.view = 'list'
  renderNav()
}

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
    ${row.url ? `<button class="key code" data-act="open-url" data-url="${esc(row.url)}" title="Open ${esc(row.key)} in Jira">${esc(row.key)}</button>` : `<span class="key code">${esc(row.key)}</span>`}
    <span class="summary" title="${esc(row.summary)}">${esc(row.summary || 'Not assigned to you any more')}</span>
    ${jira}
    ${prs}
    <button class="unassign" data-act="qualif-unassign" data-number="${q.number}" data-key="${esc(row.key)}" title="Take ${esc(row.key)} off ${esc(label)} ${q.number}" aria-label="Take ${esc(row.key)} off ${esc(label)} ${q.number}" ${q.current ? 'disabled' : ''}><span class="glyph">${G.cross}</span></button>
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
  const missing = q.tickets.some(row => !row.prs.length && !row.merged)
  const canSync = q.toSync.length && !missing && !busy
  const why = busy ? (q.current ? `${name} is syncing` : `${qualifs.label} ${qualifs.running} is syncing`)
    : missing ? 'A ticket has no open pull request'
    : !q.toSync.length ? 'Add a ticket with an open pull request first' : ''
  const choices = qualifs.candidates.filter(c => !q.tickets.some(row => row.key === c.key))
  const run = q.current || q.last
  const confirming = ui.confirm?.type === 'qualif-sync' && ui.confirm.number === q.number
  const confirmingCache = ui.confirm?.type === 'qualif-cache' && ui.confirm.number === q.number
  const prList = q.toSync.map(pr => `<span class="code">#${pr.number}</span>`).join(' ')
  const jiraKeys = !qualifs.jira ? [] : q.tickets.filter(row => row.prs.length && row.jiraQualif !== q.number).map(row => `<span class="code">${esc(row.key)}</span>`)
  const deployRunning = q.deploy && q.deploy.status !== 'completed'
  return `<article class="qualif ${q.current ? 'running' : ''}" data-qualif="${q.number}">
    <div class="qualif-head">
      <h3>${q.url ? `<button data-act="open-url" data-url="${esc(q.url)}" title="Open ${esc(q.url)}">${esc(name)}</button>` : esc(name)}</h3>
      <span class="chip ${color}"><span class="label">${esc(label)}</span></span>
      ${q.branch ? `<span class="branch code" title="${q.direct ? 'Branch of the only pull request, deployed as it is' : 'Branch rebuilt by qualif-sync'}">${esc(q.branch)}</span>` : ''}
      <span class="qualif-actions">
        <button class="btn quiet" data-act="qualif-sync" data-number="${q.number}" ${canSync ? '' : 'disabled'} title="${esc(why || (q.direct ? 'Check the pull request and show what would be deployed, deploy nothing' : 'Build the branch locally and show it, push nothing'))}">Preview</button>
        <button class="btn primary" data-act="ask-qualif-sync" data-number="${q.number}" ${canSync ? '' : 'disabled'} title="${esc(why || (q.direct ? `Deploy ${q.branch} to ${name} as it is` : qualifs.deploys ? `Push the branch and deploy it to ${name}` : 'Push the branch'))}">${qualifs.deploys ? 'Sync and deploy' : 'Sync'}</button>
        ${qualifs.cache ? `<button class="btn quiet" data-act="ask-qualif-cache" data-number="${q.number}" ${busy ? 'disabled' : ''} title="${esc(busy ? why : deployRunning ? 'A deployment is still running: clear the cache once it is done' : `Clear the cache of ${name}`)}"><span class="glyph">${G.broom}</span><span class="t">Clear the cache</span></button>` : ''}
        <button class="unassign" data-act="qualif-remove" data-number="${q.number}" title="Remove ${esc(name)} from Atelier" aria-label="Remove ${esc(name)} from Atelier" ${q.current ? 'disabled' : ''}><span class="glyph">${G.cross}</span></button>
      </span>
    </div>
    ${deployStatus(q, qualifs.cache)}
    ${q.tickets.length ? `<ul class="qualif-tickets">${q.tickets.map(row => qualifTicket(qualifs, q, row)).join('')}</ul>` : `<p class="empty">No ticket on ${esc(name)} yet.</p>`}
    ${choices.length && !q.current ? `<select class="pick" data-pick="qualif-ticket" data-number="${q.number}" aria-label="Add a ticket to ${esc(name)}">
      <option value="">Add a ticket…</option>
      ${choices.map(c => `<option value="${esc(c.key)}">${esc(c.key)} · ${esc(c.summary)}${qualifs.jira && c.qualif ? ` (Jira: ${esc(qualifs.label)} ${c.qualif})` : ''}</option>`).join('')}
    </select>` : ''}
    ${confirming ? `<div class="confirm">
      <span class="question">${q.direct ? `Deploy <strong class="code">${esc(q.branch)}</strong>, the branch of ${prList}, to <strong>${esc(name)}</strong> as it is, without rebuilding a ${esc(qualifs.label.toLowerCase())} branch`
        : `Rebuild <strong class="code">${esc(q.branch || 'the branch')}</strong> from ${esc(qualifs.base)} + ${prList}, force-push it${qualifs.deploys ? ` and deploy it to <strong>${esc(name)}</strong>` : ''}`}${jiraKeys.length ? `, then set ${esc(name)} in Jira on ${jiraKeys.join(', ')}` : ''}?</span>
      <button class="btn primary" data-act="qualif-deploy" data-number="${q.number}" ${canSync ? '' : 'disabled'}>${qualifs.deploys ? 'Sync and deploy' : 'Sync'}</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>` : ''}
    ${confirmingCache && q.cache ? `<div class="confirm">
      <span class="question">${q.cache.description ? esc(q.cache.description) : `Clear the cache of <strong>${esc(name)}</strong>? Atelier runs ${q.cache.commands.map(command => `<span class="code">${esc(command)}</span>`).join(', then ')}.`}${deployRunning ? ' A deployment is still running.' : ''}</span>
      <button class="btn primary" data-act="qualif-cache" data-number="${q.number}" ${busy ? 'disabled' : ''}>Clear the cache</button>
      <button class="btn quiet" data-act="cancel">Cancel</button>
    </div>` : ''}
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

function myReviewFact(pr) {
  if (!pr.myReview) return pr.requested ? '<span>Not reviewed by you</span>' : ''
  if (pr.myReview.stale) return '<span class="mine-stale">New commits since your review</span>'
  if (pr.myReview.state === 'APPROVED') return '<span class="mine-approved">You approved</span>'
  if (pr.myReview.state === 'CHANGES_REQUESTED') return '<span class="mine-changes">You requested changes</span>'
  return '<span>You commented</span>'
}

function reviewRow(pr) {
  const others = pr.reviews.filter(r => r.login !== pr.author && r.login !== ui.state.viewer)
  const approvals = others.filter(r => r.state === 'APPROVED').length
  const old = Date.now() - Date.parse(pr.createdAt) > 3 * 86400000
  return `<article class="review ${pr.group === 'waiting' ? 'waiting' : ''}">
    ${pr.avatar ? `<img class="avatar" src="${esc(pr.avatar)}" alt="">` : '<span class="avatar"></span>'}
    <button class="title" data-act="open-url" data-url="${esc(pr.url)}" title="Open #${pr.number} on GitHub">${esc(pr.title)}</button>
    <div class="facts">
      <span class="who">${esc(pr.author)}</span>
      <span class="code">${esc(pr.repo)}#${pr.number}</span>
      <span class="code"><span class="add">+${pr.additions}</span> <span class="del">−${pr.deletions}</span></span>
      <span class="${old ? 'old' : ''}">${age(pr.createdAt)}</span>
      ${checks(pr)}
      ${approvals ? `<span class="mine-approved">${approvals} approval${approvals > 1 ? 's' : ''}</span>` : ''}
      ${myReviewFact(pr)}
    </div>
    <div class="actions">
      <button data-act="open-url" data-url="${esc(pr.url)}/files"><span class="glyph">${G.open}</span><span class="t">Open the diff</span></button>
      <button data-act="review-claude" data-id="${esc(pr.id)}"><span class="glyph">${G.terminal}</span><span class="t">${pr.terminal ? 'Open the review session' : 'Review with Claude'}</span></button>
    </div>
  </article>`
}

function repoFilter(state) {
  const repos = [...new Set(state.reviews.map(pr => pr.repo))].sort((a, b) => a.localeCompare(b))
  if (repos.length < 2) return ''
  const shown = repos.filter(repo => !ui.hiddenRepos.has(repo))
  const label = shown.length === repos.length ? 'All repositories' : shown.length === 1 ? shown[0] : `${shown.length} of ${repos.length} repositories`
  return `<div class="repo-filter">
    <button class="repo-filter-button" data-act="toggle-repo-menu" aria-haspopup="true" aria-expanded="${ui.repoMenu}">${esc(label)}</button>
    ${ui.repoMenu ? `<div class="repo-filter-menu" role="group" aria-label="Repositories">
      ${repos.map(repo => `<label><input type="checkbox" data-pick="review-repo" data-repo="${esc(repo)}" ${ui.hiddenRepos.has(repo) ? '' : 'checked'}> <span class="code">${esc(repo)}</span></label>`).join('')}
      <div class="repo-filter-actions">
        <button class="btn quiet" data-act="repos-all">All</button>
        <button class="btn quiet" data-act="repos-none">None</button>
      </div>
    </div>` : ''}
  </div>`
}

function renderReviews(state) {
  const visible = state.reviews.filter(pr => !ui.hiddenRepos.has(pr.repo))
  const group = name => visible.filter(pr => pr.group === name)
  const waiting = group('waiting')
  const approved = group('approved')
  const reviewed = group('reviewed')
  const elsewhere = group('elsewhere')
  const parts = [`<h2 id="reviews-title">To review <span class="count">${waiting.length || ''}</span></h2>`]
  parts.push(repoFilter(state))
  if (state.reviewRepos.length) parts.push(`<p class="repos">Open pull requests from your teammates in <span class="code">${state.reviewRepos.map(esc).join(', ')}</span>, longest waiting first</p>`)
  if (state.loading.github && !state.reviews.length) {
    parts.push('<p class="empty">Loading open pull requests…</p>')
  } else {
    parts.push(waiting.length ? waiting.map(reviewRow).join('') : '<p class="empty">Nothing is waiting for your review.</p>')
    if (approved.length) {
      parts.push(`<h3>Already approved by others <span class="count">${approved.length}</span></h3>`)
      parts.push(approved.map(reviewRow).join(''))
    }
    if (reviewed.length) {
      parts.push(`<h3>Reviewed by you <span class="count">${reviewed.length}</span></h3>`)
      parts.push(reviewed.map(reviewRow).join(''))
    }
    if (elsewhere.length) {
      if (ui.showElsewhere) {
        parts.push(`<h3>Other repositories <span class="count">${elsewhere.length}</span></h3>`)
        parts.push(elsewhere.map(reviewRow).join(''))
        parts.push('<button class="more" data-act="toggle-elsewhere">Hide other repositories</button>')
      } else {
        parts.push(`<button class="more" data-act="toggle-elsewhere">Show ${elsewhere.length} open pull requests in other repositories</button>`)
      }
    }
  }
  $('reviews').innerHTML = parts.join('')
}

/* Render loop */

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

const pickedRepo = () => $('repo-pick')?.value || ui.state.repos[0]

function setHiddenRepos(repos) {
  ui.hiddenRepos = new Set(repos)
  try {
    localStorage.setItem('atelier.hiddenRepos', JSON.stringify([...ui.hiddenRepos]))
  } catch {}
  render()
}

const handlers = {
  noop() {},
  'toggle-elsewhere': () => {
    ui.showElsewhere = !ui.showElsewhere
    render()
  },
  'toggle-repo-menu': () => {
    ui.repoMenu = !ui.repoMenu
    render()
  },
  'repos-all': () => setHiddenRepos([]),
  'repos-none': () => setHiddenRepos(ui.state.reviews.map(pr => pr.repo)),
  refresh: () => act('refresh'),
  'open-url': el => act('openUrl', { url: el.dataset.url }),
  'claude-repo': () => act('claudeRepo', { name: pickedRepo() }),
  'shell-repo': () => act('shellRepo', { name: pickedRepo() }),
  'sl-web': () => act('slWeb', { name: pickedRepo() }, 'sl-web'),
  'editor-repo': () => act('editorRepo', { name: pickedRepo() }),
  'close-web': () => closeWeb(),
  'reload-web': () => {
    const frame = web.frames.get(web.active)
    if (frame) frame.src = frame.dataset.url
  },
  'ask-take': el => {
    ui.confirm = { type: 'take', key: el.dataset.key }
    render()
    $('unassigned').querySelector(`[data-ticket="${el.dataset.key}"] [data-act="take"]`)?.focus()
  },
  async take(el) {
    const key = el.dataset.key
    if (ui.confirm?.type !== 'take' || ui.confirm.key !== key) return
    const result = await act('take', { key }, `take:${key}`)
    if (result?.ok) {
      ui.confirm = null
      setTab('mine')
    }
    render()
  },
  'open-ticket': el => {
    const ticket = ui.state.tickets.find(t => t.key === el.dataset.key)
    if (ticket) act('openUrl', { url: ticket.url })
  },
  claude: el => act('claudeOpen', { key: el.dataset.key }),
  'claude-new': el => act('claudeOpen', { key: el.dataset.key, fresh: true }),
  'focus-session': el => act('focusSession', { id: el.dataset.id }),
  'review-claude': el => act('reviewWithClaude', { id: el.dataset.id }),
  'workflow-run': el => act('workflowRun', { id: el.dataset.id }, `workflow:${el.dataset.id}`),
  'run-answer': el => act('runAnswer', { id: el.dataset.id, option: el.dataset.option }, `run:${el.dataset.id}`),
  'run-dismiss': el => act('runDismiss', { id: el.dataset.id }),
  'run-resume': el => act('runResume', { id: el.dataset.id }, `run:${el.dataset.id}`),
  'ask-move': el => {
    ui.confirm = { type: 'move', key: el.dataset.key, station: Number(el.dataset.station) }
    render()
    ;[...document.querySelectorAll(`[data-ticket="${el.dataset.key}"] [data-act="move"]`)].find(b => b.offsetParent !== null)?.focus()
  },
  'ask-manual-time': el => {
    const key = el.dataset.key
    ui.confirm = { type: 'manual-time', key, date: localDay(), scope: el.dataset.scope, entry: el.dataset.entry }
    render()
    ;[...document.querySelectorAll(`[data-draft="manual:${key}"]`)].find(i => i.offsetParent !== null)?.focus()
  },
  'ask-delete-time': el => {
    ui.confirm = { type: 'delete-time', key: el.dataset.key, id: el.dataset.id }
    render()
    document.querySelector(`[data-act="delete-time"][data-id="${el.dataset.id}"]`)?.focus()
  },
  async 'delete-time'(el) {
    const { key, id } = el.dataset
    if (ui.confirm?.type !== 'delete-time' || ui.confirm.id !== id) return
    const result = await act('logDelete', { key, id }, `log:${key}`)
    if (result?.ok) ui.confirm = null
    render()
  },
  'ask-new-time': () => {
    ui.confirm = { type: 'new-time', date: localDay() }
    render()
    $('new-key')?.focus()
  },
  'ask-edit-time': el => {
    ui.confirm = { type: 'edit-time', key: el.dataset.key, id: el.dataset.id }
    render()
    ;[...document.querySelectorAll(`[data-draft="edit:${el.dataset.id}"]`)].find(i => i.offsetParent !== null)?.focus()
  },
  cancel: () => {
    ui.confirm = null
    render()
  },
  async move(el) {
    const { key, station } = ui.confirm || {}
    if (key !== el.dataset.key) return
    const result = await act('move', { key, station }, `move:${key}`)
    if (result?.ok) ui.confirm = null
    render()
  },
  flag: el => act('flag', { key: el.dataset.key, blocked: el.dataset.blocked === '1' }, `flag:${el.dataset.key}`),
  'qualif-sync': el => act('qualifSync', { number: Number(el.dataset.number), deploy: false }, `qualif:${el.dataset.number}`),
  'ask-qualif-sync': el => {
    ui.confirm = { type: 'qualif-sync', number: Number(el.dataset.number) }
    render()
    $('qualifs').querySelector(`[data-qualif="${el.dataset.number}"] [data-act="qualif-deploy"]`)?.focus()
  },
  async 'qualif-deploy'(el) {
    const number = Number(el.dataset.number)
    if (ui.confirm?.type !== 'qualif-sync' || ui.confirm.number !== number) return
    ui.confirm = null
    await act('qualifSync', { number, deploy: true }, `qualif:${number}`)
  },
  'ask-qualif-cache': el => {
    ui.confirm = { type: 'qualif-cache', number: Number(el.dataset.number) }
    render()
    $('qualifs').querySelector(`[data-qualif="${el.dataset.number}"] [data-act="qualif-cache"]`)?.focus()
  },
  async 'qualif-cache'(el) {
    const number = Number(el.dataset.number)
    if (ui.confirm?.type !== 'qualif-cache' || ui.confirm.number !== number) return
    ui.confirm = null
    await act('qualifCacheClear', { number }, `qualif:${number}`)
  },
  'ask-rebase': el => {
    ui.confirm = { type: 'rebase', key: el.dataset.key }
    render()
    ;[...document.querySelectorAll(`[data-ticket="${el.dataset.key}"] [data-act="rebase"]`)].find(b => b.offsetParent !== null)?.focus()
  },
  async rebase(el) {
    const key = el.dataset.key
    if (ui.confirm?.type !== 'rebase' || ui.confirm.key !== key) return
    const result = await act('rebase', { key }, `rebase:${key}`)
    if (result?.ok) ui.confirm = null
    render()
  },
  'qualif-unassign': el => act('qualifUnassign', { number: Number(el.dataset.number), key: el.dataset.key }),
  'qualif-remove': el => act('qualifRemove', { number: Number(el.dataset.number) }),
  'timer-start': el => act('timerStart', { key: el.dataset.key }),
  async 'set-theme'(el) {
    const theme = el.dataset.theme
    const result = await act('setTheme', { theme })
    if (!result?.ok) return
    document.documentElement.dataset.theme = theme === 'default' ? '' : theme
    applyTerminalTheme()
    renderSettings(ui.state)
  },
  'choose-dev-dir': () => act('chooseDevDir', {}, 'choose-dev-dir'),
  'go-settings': () => {
    ui.settingsTab = 'tickets'
    renderSettings(ui.state)
    setTab('settings')
  },
  'settings-tab'(el) {
    ui.settingsTab = SETTINGS_TABS.some(tab => tab.id === el.dataset.section) ? el.dataset.section : 'global'
    try {
      localStorage.setItem('atelier.settingsTab', ui.settingsTab)
    } catch {}
    renderSettings(ui.state)
  },
  async 'filter-add'() {
    const filters = ui.state.jira.filters
    const result = await act('jiraFilters', { filters: [...filters, { label: `Filter ${filters.length + 1}`, columns: [] }] })
    if (!result?.ok) return
    const input = document.querySelector(`[data-filter-label="${filters.length}"]`)
    input?.focus()
    input?.select()
  },
  'filter-remove': el => act('jiraFilters', { filters: ui.state.jira.filters.filter((_, index) => index !== Number(el.dataset.index)) }),
  'set-editor': el => {
    if (el.getAttribute('aria-checked') !== 'true') act('setEditor', { command: el.dataset.command })
  },
  'timer-stop': () => act('timerStop'),
  'timer-discard': el => {
    delete ui.drafts[el.dataset.key]
    act('timerDiscard', { key: el.dataset.key })
  }
}

document.addEventListener('click', event => {
  if (ui.repoMenu && !event.target.closest('.repo-filter')) {
    ui.repoMenu = false
    render()
  }
  const el = event.target.closest('[data-act]')
  if (!el || el.disabled) return
  event.preventDefault()
  handlers[el.dataset.act]?.(el)
})

document.addEventListener('change', event => {
  if (event.target.dataset?.manualDate && ['manual-time', 'new-time'].includes(ui.confirm?.type)) {
    ui.confirm.date = event.target.value
    return
  }
  if (event.target.dataset?.pick === 'review-repo') {
    const hidden = new Set(ui.hiddenRepos)
    if (event.target.checked) hidden.delete(event.target.dataset.repo)
    else hidden.add(event.target.dataset.repo)
    setHiddenRepos(hidden)
    return
  }
  const pick = event.target.dataset?.pick
  const jira = ui.state?.jira
  if (event.target.dataset?.filterLabel) {
    const index = Number(event.target.dataset.filterLabel)
    act('jiraFilters', { filters: jira.filters.map((filter, i) => i === index ? { ...filter, label: event.target.value } : filter) })
      .then(result => { if (!result?.ok) renderSettings(ui.state) })
    return
  }
  const qualifSetting = event.target.dataset?.qualifField
  if (qualifSetting || pick === 'qualif-enabled') {
    const field = qualifSetting || 'enabled'
    const value = field === 'enabled' ? event.target.checked : event.target.value
    if (event.target.tagName === 'SELECT') event.target.blur()
    act('qualifSetting', { field, value }).then(result => { if (!result?.ok) renderSettings(ui.state) })
    return
  }
  if (pick === 'jira-board') {
    event.target.blur()
    if (event.target.value) act('jiraBoard', { id: Number(event.target.value) })
    return
  }
  if (pick === 'mine-column') {
    const column = event.target.dataset.column
    const taken = new Set(jira.filters.flatMap(filter => filter.columns))
    const all = jira.columns.map(c => c.id).filter(c => !taken.has(c))
    const current = jira.mineColumns || all
    const next = event.target.checked ? [...current.filter(c => c !== column), column] : current.filter(c => c !== column)
    act('jiraMine', { columns: all.every(c => next.includes(c)) ? null : next })
    return
  }
  if (pick === 'unassigned-column' || pick === 'filter-column') {
    const column = event.target.dataset.column
    const toggle = list => event.target.checked ? [...list.filter(c => c !== column), column] : list.filter(c => c !== column)
    if (pick === 'unassigned-column') act('jiraUnassigned', { columns: toggle(jira.unassignedColumns) })
    else {
      const index = Number(event.target.dataset.index)
      act('jiraFilters', { filters: jira.filters.map((filter, i) => i === index ? { ...filter, columns: toggle(filter.columns) } : filter) })
    }
    return
  }
  if (pick === 'qualif-add' || pick === 'qualif-ticket') {
    const value = event.target.value
    event.target.blur()
    if (!value) return
    if (pick === 'qualif-add') act('qualifAdd', { number: Number(value) })
    else act('qualifAssign', { number: Number(event.target.dataset.number), key: value })
    return
  }
  if (pick !== 'repo') return
  ui.repo = event.target.value
  try {
    localStorage.setItem('atelier.repo', ui.repo)
  } catch {}
})

document.addEventListener('toggle', event => {
  const number = Number(event.target.dataset?.log)
  if (!number || event.target.closest('.qualif.running')) return
  if (event.target.open) ui.logs.add(number)
  else ui.logs.delete(number)
}, true)

function refreshNewTimeForm(form) {
  const fresh = document.createElement('div')
  fresh.innerHTML = newTimeForm()
  form.querySelector('[type="submit"]').disabled = fresh.querySelector('[type="submit"]').disabled
  const hint = form.querySelector('#hint-new')
  const next = fresh.querySelector('#hint-new')
  hint.className = next.className
  hint.textContent = next.textContent
}

document.addEventListener('input', event => {
  const field = event.target.dataset?.jira
  if (field) {
    ui.jiraDraft[field] = event.target.value
    return
  }
  if (event.target.dataset?.newKey !== undefined) {
    ui.drafts['new-key'] = event.target.value
    refreshNewTimeForm(event.target.closest('form'))
    return
  }
  const key = event.target.dataset?.draft
  if (!key) return
  ui.drafts[key] = event.target.value
  const form = event.target.closest('form')
  if (form.dataset.form === 'new-log') {
    refreshNewTimeForm(form)
    return
  }
  const parsed = parseDuration(event.target.value)
  const valid = parsed >= 60 && parsed <= 86400
  form.querySelector('[type="submit"]').disabled = !valid
  const hint = form.querySelector('.hint, .invalid')
  const manual = form.dataset.form === 'manual-log'
  const editing = form.dataset.form === 'edit-log'
  const blank = manual && !event.target.value.trim()
  hint.className = valid || blank ? 'hint' : 'invalid'
  hint.textContent = valid ? `That logs ${duration(parsed)}.`
    : blank ? 'Formats: 1h, 1.5h, 15m, 1h 30m'
    : manual || editing ? 'Use a duration such as 1h, 1.5h, 15m or 1h 30m'
    : 'Use a duration such as 1h15, 45m or 1.5'
})

document.addEventListener('submit', async event => {
  if (event.target.closest('[data-form="jira"]')) {
    event.preventDefault()
    document.activeElement?.blur()
    const jira = ui.state.jira
    const draft = ui.jiraDraft
    const result = await act('jiraConnect', { base: draft.base ?? jira.base, email: draft.email ?? jira.email, token: draft.token ?? '' }, 'jira-connect')
    if (result?.ok) {
      ui.jiraDraft = {}
      renderSettings(ui.state)
    }
    return
  }
  const created = event.target.closest('[data-form="new-log"]')
  if (created) {
    event.preventDefault()
    if (!newTimeValid()) return
    const key = ui.drafts['new-key'].trim().toUpperCase()
    const seconds = parseDuration(ui.drafts['manual:new'])
    const result = await act('log', { key, seconds, date: ui.confirm.date }, 'log:new')
    if (result?.ok) {
      delete ui.drafts['new-key']
      delete ui.drafts['manual:new']
      ui.confirm = null
      render()
    }
    return
  }
  const edit = event.target.closest('[data-form="edit-log"]')
  if (edit) {
    event.preventDefault()
    const { key, id } = edit.dataset
    const seconds = parseDuration(ui.drafts[`edit:${id}`] ?? '')
    if (!(seconds >= 60 && seconds <= 86400)) return
    const result = await act('logUpdate', { key, id, seconds }, `log:${key}`)
    if (result?.ok) {
      delete ui.drafts[`edit:${id}`]
      ui.confirm = null
      render()
    }
    return
  }
  const manual = event.target.closest('[data-form="manual-log"]')
  if (manual) {
    event.preventDefault()
    const key = manual.dataset.key
    const seconds = parseDuration(ui.drafts[`manual:${key}`] ?? '')
    const date = ui.confirm?.type === 'manual-time' ? ui.confirm.date : ''
    if (!date || !(seconds >= 60 && seconds <= 86400)) return
    const result = await act('log', { key, seconds, date }, `log:${key}`)
    if (result?.ok) {
      delete ui.drafts[`manual:${key}`]
      ui.confirm = null
      render()
    }
    return
  }
  const form = event.target.closest('[data-form="log"]')
  if (!form) return
  event.preventDefault()
  const key = form.dataset.key
  const ticket = ui.state.tickets.find(t => t.key === key)
  const seconds = parseDuration(ui.drafts[key] ?? duration(roundedForLog(ticket?.time.unlogged || 0)))
  const result = await act('log', { key, seconds }, `log:${key}`)
  if (result?.ok) delete ui.drafts[key]
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

window.atelier.onState(state => {
  ui.state = state
  if (ui.confirm?.type === 'move' && !state.tickets.some(t => t.key === ui.confirm.key)) ui.confirm = null
  if (ui.confirm?.type === 'take' && !state.unassigned.some(t => t.key === ui.confirm.key)) ui.confirm = null
  if (/^qualif-/.test(ui.confirm?.type) && !state.qualifs?.items.some(q => q.number === ui.confirm.number)) ui.confirm = null
  if (ui.confirm?.type === 'rebase' && !state.tickets.some(t => t.key === ui.confirm.key && t.rebasable)) ui.confirm = null
  render()
})

window.atelier.onQualifOutput((number, chunk) => {
  const item = ui.state?.qualifs?.items.find(q => q.number === number)
  if (item?.current) item.current.output += chunk
  const pre = document.querySelector(`[data-qualif="${number}"] pre`)
  if (!pre) return
  pre.textContent += chunk
  pre.scrollTop = pre.scrollHeight
})

let askingToQuit = false
window.atelier.onConfirmQuit(async running => {
  if (askingToQuit) return
  askingToQuit = true
  const quit = await ask({
    message: running === 1 ? 'A Claude session is still running in Atelier' : `${running} Claude sessions are still running in Atelier`,
    detail: 'Quitting ends them. You can resume them later from the ticket list.',
    confirm: 'Quit and end them',
    cancel: 'Keep Atelier open'
  })
  askingToQuit = false
  if (quit) window.atelier.quit()
})

renderNav()
setInterval(tick, 1000)
setInterval(() => renderSync(ui.state || { loading: {}, errors: {}, updated: {} }), 30000)
document.fonts.ready.then(() => window.atelier.ready())
