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
  const live = run.live
  const ticket = run.ticket && [...state.tickets, ...state.unassigned].find(t => t.key === run.ticket)
  const since = run.stageSince || run.startedAt
  const line = live ? run.stage || 'Starting Claude…' : run.message || run.stage || ''
  return `<article class="run ${live ? 'live' : ''}" data-run="${esc(run.id)}">
    <div class="run-head">
      <span class="glyph">${G.workflow}</span>
      <h3>${esc(run.label)}</h3>
      <span class="chip ${color}"><span class="label">${esc(label)}</span></span>
      ${run.ticket ? jiraKey(run.ticket, ticket?.url, ticket?.summary) : ''}
      ${runPr(state, run)}
      <span class="run-actions">
        ${run.session && !run.running ? `<button class="btn quiet" data-act="run-resume" data-id="${esc(run.id)}" title="Resume this run's Claude session in Atelier" ${ui.busy.has(`run:${run.id}`) ? 'disabled' : ''}><span class="glyph">${G.terminal}</span><span class="t">Resume the session</span></button>`
          : run.open ? `<button class="btn quiet" data-act="open-session" data-id="${esc(run.terminal)}"><span class="glyph">${G.terminal}</span><span class="t">Open the session</span></button>` : ''}
        ${live ? '' : removeButton({ act: 'run-dismiss', data: { id: run.id }, label: 'Remove this run from the list' })}
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

Object.assign(handlers, {
  'workflow-run': el => act('workflowRun', { id: el.dataset.id }, `workflow:${el.dataset.id}`),
  'run-answer': el => act('runAnswer', { id: el.dataset.id, option: el.dataset.option }, `run:${el.dataset.id}`),
  'run-dismiss': el => act('runDismiss', { id: el.dataset.id }),
  'run-resume': el => act('runResume', { id: el.dataset.id }, `run:${el.dataset.id}`)
})
