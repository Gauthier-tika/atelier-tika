function renderLaunch(state) {
  const active = document.activeElement
  if (active?.tagName === 'SELECT' && $('launch').contains(active)) return
  if (!state.repos.length) {
    paint($('launch'), `
      <p class="launch-empty">No repository in <span class="code">${esc(state.devDir)}</span></p>
      <button class="btn launch-claude" data-act="choose-dev-dir" title="Pick the folder that holds your repositories"><span class="glyph">${G.folder}</span><span class="t">Choose the folder</span></button>`)
    return
  }
  const repo = state.repos.includes(ui.repo) ? ui.repo : state.repos[0]
  const starting = ui.busy.has('sl-web')
  paint($('launch'), `
    <label class="repo" for="repo-pick" title="Where new sessions, terminals and ${esc(state.editor.name)} open">
      <span class="glyph">${G.folder}</span>
      <select id="repo-pick" data-pick="repo">${state.repos.map(name => `<option ${name === repo ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
    </label>
    <button class="btn primary launch-claude" data-act="claude-repo" title="Start a Claude session with no ticket in ${esc(repo)}"><span class="glyph claude">${G.claude}</span><span class="t">New Claude session</span></button>
    <div class="launch-tools">
      <button class="tool" data-act="shell-repo" title="Open a plain terminal, without Claude, in ${esc(repo)}"><span class="glyph">${G.terminal}</span><span class="t">Terminal</span></button>
      ${state.herdr ? `<button class="tool" data-act="herdr-open" title="Open a terminal in Atelier and start herdr in it, with the sessions it kept"><span class="glyph">${G.panes}</span><span class="t">herdr</span></button>` : ''}
      <button class="tool" data-act="editor-repo" title="Open ${esc(state.editor.name)} in ${esc(repo)}"><span class="glyph">${G.edit}</span><span class="t">${esc(state.editor.name)}</span></button>
      ${state.sapling ? `<button class="tool" data-act="sl-web" title="Show Sapling Web (sl web) on ${esc(repo)} inside Atelier" ${starting ? 'disabled' : ''}><span class="glyph">${G.smartlog}</span><span class="t">${starting ? 'Starting…' : 'sl web'}</span></button>` : ''}
    </div>
    ${state.workflows.length ? `<div class="launch-workflows">${state.workflows.map(w => {
      const live = state.runs.some(run => run.workflow === w.id && run.live)
      return `<button class="tool" data-act="workflow-run" data-id="${esc(w.id)}" title="${esc(live ? `Open the running ${w.label}` : w.description || `Start ${w.label}`)}">
        <span class="glyph">${G.workflow}</span><span class="t">${esc(w.label)}</span>${live ? '<span class="state">Running</span>' : ''}</button>`
    }).join('')}</div>` : ''}`)
}

const pickedRepo = () => $('repo-pick')?.value || ui.state.repos[0]

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

Object.assign(handlers, {
  'claude-repo': () => act('claudeRepo', { name: pickedRepo() }),
  'shell-repo': () => act('shellRepo', { name: pickedRepo() }),
  'sl-web': () => act('slWeb', { name: pickedRepo() }, 'sl-web'),
  'herdr-open': () => act('herdrOpen', {}, 'herdr'),
  'editor-repo': () => act('editorRepo', { name: pickedRepo() }),
  'close-web': () => closeWeb(),
  'reload-web': () => {
    const frame = web.frames.get(web.active)
    if (frame) frame.src = frame.dataset.url
  }
})

Object.assign(changes, {
  repo: el => {
    ui.repo = el.value
    store('atelier.repo', ui.repo)
  }
})
