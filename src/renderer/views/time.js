function manualForm(key, scope = '') {
  const draft = ui.drafts[`manual:${key}`] ?? ''
  const parsed = parseDuration(draft)
  const valid = parsed >= 60 && parsed <= 86400
  const busy = ui.busy.has(`log:${key}`)
  const id = `manual${scope ? `-${scope}` : ''}-${esc(key)}`
  return `<form class="confirm" data-form="manual-log" data-key="${esc(key)}">
    <label class="question" for="${id}">Add time on <strong class="code">${esc(key)}</strong></label>
    <input id="${id}" data-draft="manual:${esc(key)}" value="${esc(draft)}" placeholder="1h 30m" autocomplete="off" spellcheck="false" aria-describedby="hint-${id}">
    <input type="date" class="date" data-pick="manual-date" value="${esc(ui.confirm.date)}" max="${localDay()}" required aria-label="Day">
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
    <input type="date" class="date" data-pick="manual-date" value="${esc(ui.confirm.date)}" max="${localDay()}" required aria-label="Day">
    <button class="btn primary" type="submit" ${newTimeValid() && !busy ? '' : 'disabled'}>${busy ? 'Logging…' : 'Log time'}</button>
    <button class="btn quiet" type="button" data-act="cancel">Cancel</button>
    <span class="${bad ? 'invalid' : 'hint'}" id="hint-new">${hint}</span>
  </form>`
}

function refreshNewTimeForm(form) {
  const fresh = document.createElement('div')
  fresh.innerHTML = newTimeForm()
  form.querySelector('[type="submit"]').disabled = fresh.querySelector('[type="submit"]').disabled
  const hint = form.querySelector('#hint-new')
  const next = fresh.querySelector('#hint-new')
  hint.className = next.className
  hint.textContent = next.textContent
}

function deleteConfirm(entry) {
  return confirmBox({
    question: `Delete the <strong class="code">${duration(entry.seconds)}</strong> logged on <strong class="code">${esc(entry.key)}</strong> at ${esc(entry.time)}? This removes it from Jira.`,
    act: 'delete-time',
    data: { id: entry.id, key: entry.key },
    label: 'Delete',
    busyLabel: 'Deleting…',
    busy: ui.busy.has(`log:${entry.key}`)
  })
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
      const editing = confirming('edit-time', { id: entry.id })
      const adding = confirming('manual-time', { scope: 'time', key: entry.key, entry: entry.id })
      const deleting = confirming('delete-time', { id: entry.id })
      return `<article class="time-entry" data-entry="${esc(entry.id)}">
        <div class="head">
          <span class="at code">${esc(entry.time)}</span>
          ${jiraKey(entry.key, entry.url)}
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
  paint($('time'), parts.join(''))
}

Object.assign(handlers, {
  'ask-manual-time': el => askConfirm({ type: 'manual-time', key: el.dataset.key, date: localDay(), scope: el.dataset.scope, entry: el.dataset.entry }, `[data-draft="manual:${el.dataset.key}"]`),
  'ask-delete-time': el => askConfirm({ type: 'delete-time', key: el.dataset.key, id: el.dataset.id }, `[data-act="delete-time"][data-id="${el.dataset.id}"]`),
  'delete-time': el => confirmed('delete-time', { id: el.dataset.id }, () => act('logDelete', { key: el.dataset.key, id: el.dataset.id }, `log:${el.dataset.key}`)),
  'ask-new-time': () => askConfirm({ type: 'new-time', date: localDay() }, '#new-key'),
  'ask-edit-time': el => askConfirm({ type: 'edit-time', key: el.dataset.key, id: el.dataset.id }, `[data-draft="edit:${el.dataset.id}"]`)
})

Object.assign(changes, {
  'manual-date': el => {
    if (['manual-time', 'new-time'].includes(ui.confirm?.type)) ui.confirm.date = el.value
  }
})

Object.assign(forms, {
  async 'new-log'() {
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
  },
  async 'edit-log'(form) {
    const { key, id } = form.dataset
    const seconds = parseDuration(ui.drafts[`edit:${id}`] ?? '')
    if (!(seconds >= 60 && seconds <= 86400)) return
    const result = await act('logUpdate', { key, id, seconds }, `log:${key}`)
    if (result?.ok) {
      delete ui.drafts[`edit:${id}`]
      ui.confirm = null
      render()
    }
  },
  async 'manual-log'(form) {
    const key = form.dataset.key
    const seconds = parseDuration(ui.drafts[`manual:${key}`] ?? '')
    const date = ui.confirm?.type === 'manual-time' ? ui.confirm.date : ''
    if (!date || !(seconds >= 60 && seconds <= 86400)) return
    const result = await act('log', { key, seconds, date }, `log:${key}`)
    if (result?.ok) {
      delete ui.drafts[`manual:${key}`]
      ui.confirm = null
      render()
    }
  }
})

document.addEventListener('input', event => {
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
