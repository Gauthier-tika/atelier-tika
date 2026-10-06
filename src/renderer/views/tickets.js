function track(ticket, columns) {
  const target = confirming('move', { key: ticket.key }) ? ui.confirm.station : -1
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

function sessionLook(s, { unread = false } = {}) {
  return {
    'needs-you': ['sand', 'Needs you'],
    working: ['purple', 'Working'],
    done: s.seen ? ['idle', 'Finished'] : ['sand', unread ? 'Finished, unread' : 'Finished'],
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
  if (confirming('rebase', { key: ticket.key }) && ticket.rebasable) {
    const pr = ticket.rebasable
    return confirmBox({
      question: `Rebase <strong class="code">#${pr.number}</strong> onto <strong class="code">origin/${esc(pr.base)}</strong> and force-push <span class="code">${esc(pr.branch)}</span>? On conflicts, Claude resolves them in a worktree and asks you before pushing.`,
      act: 'rebase',
      data: { key: ticket.key },
      label: 'Rebase and push',
      busyLabel: 'Rebasing…',
      busy: ui.busy.has(`rebase:${ticket.key}`)
    })
  }
  if (confirming('move', { key: ticket.key })) {
    return confirmBox({
      question: `Move <strong class="code">${esc(ticket.key)}</strong> from ${esc(ticket.column)} to <strong>${esc(columns[ui.confirm.station])}</strong>?`,
      act: 'move',
      data: { key: ticket.key },
      label: 'Move',
      busyLabel: 'Moving…',
      busy: ui.busy.has(`move:${ticket.key}`)
    })
  }
  if (confirming('manual-time', { key: ticket.key, scope: undefined })) return manualForm(ticket.key)
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
      ${jiraKey(ticket.key, ticket.url)}
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

const ticketsIn = (state, stage) => state.tickets.filter(t => t.stage === stage)

function ticketList(tickets, columns) {
  const blocked = tickets.filter(t => t.blocked)
  const parts = [tickets.filter(t => !t.blocked).map(t => ticketRow(t, columns)).join('')]
  if (blocked.length) parts.push(`<h3>Blocked <span class="count">${blocked.length}</span></h3>`, blocked.map(t => ticketRow(t, columns)).join(''))
  return parts.join('')
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
      const [color, label] = sessionLook(s, { unread: true })
      return `<div class="row">
        <button class="title" data-act="focus-session" data-id="${esc(s.id)}" title="Switch to this session's terminal">${esc(s.title || s.prompt || s.project)}</button>
        <span class="chip ${color}"><span class="glyph claude">${G.claude}</span><span class="label">${label}</span></span>
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
  paint($('mine'), parts.join(''))
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
  paint($(stage), parts.join(''))
}

function unassignedRow(ticket, inProgress) {
  const busy = ui.busy.has(`take:${ticket.key}`)
  return `<article class="ticket" data-ticket="${esc(ticket.key)}">
    <div class="head">
      ${jiraKey(ticket.key, ticket.url)}
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
    ${confirming('take', { key: ticket.key }) ? confirmBox({
      question: `Assign <strong class="code">${esc(ticket.key)}</strong> to you and move it from ${esc(ticket.column)} to <strong>${esc(inProgress || 'In progress')}</strong>?`,
      act: 'take',
      data: { key: ticket.key },
      label: 'Take it',
      busyLabel: 'Taking…',
      busy
    }) : ''}
  </article>`
}

function renderUnassigned(state) {
  const tickets = state.unassigned
  const parts = [`<h2 id="unassigned-title">Unassigned <span class="count">${tickets.length || ''}</span></h2>`]
  if (state.errors.jira) parts.push(`<p class="notice">Jira did not answer: ${esc(state.errors.jira)}. Refresh once it is back.</p>`)
  parts.push(tickets.length
    ? tickets.map(t => unassignedRow(t, state.inProgress)).join('')
    : `<p class="empty">${state.loading.jira ? 'Loading the board…' : 'Every open ticket on the board has someone on it.'}</p>`)
  paint($('unassigned'), parts.join(''))
}

Object.assign(handlers, {
  'ask-take': el => askConfirm({ type: 'take', key: el.dataset.key }, `[data-ticket="${el.dataset.key}"] [data-act="take"]`),
  async take(el) {
    const key = el.dataset.key
    const result = await confirmed('take', { key }, () => act('take', { key }, `take:${key}`))
    if (result?.ok) setTab('mine')
  },
  'open-ticket': el => {
    const ticket = ui.state.tickets.find(t => t.key === el.dataset.key)
    if (ticket) act('openUrl', { url: ticket.url })
  },
  claude: el => act('claudeOpen', { key: el.dataset.key }),
  'claude-new': el => act('claudeOpen', { key: el.dataset.key, fresh: true }),
  'focus-session': el => act('focusSession', { id: el.dataset.id }),
  'ask-move': el => askConfirm({ type: 'move', key: el.dataset.key, station: Number(el.dataset.station) }, `[data-ticket="${el.dataset.key}"] [data-act="move"]`),
  move: el => confirmed('move', { key: el.dataset.key }, () => act('move', { key: ui.confirm.key, station: ui.confirm.station }, `move:${el.dataset.key}`)),
  flag: el => act('flag', { key: el.dataset.key, blocked: el.dataset.blocked === '1' }, `flag:${el.dataset.key}`),
  'ask-rebase': el => askConfirm({ type: 'rebase', key: el.dataset.key }, `[data-ticket="${el.dataset.key}"] [data-act="rebase"]`),
  rebase: el => confirmed('rebase', { key: el.dataset.key }, () => act('rebase', { key: el.dataset.key }, `rebase:${el.dataset.key}`)),
  'timer-start': el => act('timerStart', { key: el.dataset.key }),
  'timer-stop': () => act('timerStop'),
  'timer-discard': el => {
    delete ui.drafts[el.dataset.key]
    act('timerDiscard', { key: el.dataset.key })
  }
})

Object.assign(forms, {
  async log(form) {
    const key = form.dataset.key
    const ticket = ui.state.tickets.find(t => t.key === key)
    const seconds = parseDuration(ui.drafts[key] ?? duration(roundedForLog(ticket?.time.unlogged || 0)))
    const result = await act('log', { key, seconds }, `log:${key}`)
    if (result?.ok) delete ui.drafts[key]
  }
})

Object.assign(confirmStillApplies, {
  move: (confirm, state) => state.tickets.some(t => t.key === confirm.key),
  take: (confirm, state) => state.unassigned.some(t => t.key === confirm.key),
  rebase: (confirm, state) => state.tickets.some(t => t.key === confirm.key && t.rebasable)
})
