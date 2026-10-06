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
