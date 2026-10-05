const terminalTheme = {
  background: '#212337',
  foreground: '#cccee1',
  cursor: '#cccee1',
  cursorAccent: '#212337',
  selectionBackground: '#43466f',
  selectionForeground: '#cccee1',
  black: '#323453',
  red: '#f1855b',
  green: '#13be76',
  yellow: '#e8c59b',
  blue: '#9b90f4',
  magenta: '#eb94b2',
  cyan: '#8acfef',
  white: '#d9dae8',
  brightBlack: '#525689',
  brightRed: '#f1855b',
  brightGreen: '#13be76',
  brightYellow: '#e8c59b',
  brightBlue: '#9b90f4',
  brightMagenta: '#eb94b2',
  brightCyan: '#8acfef',
  brightWhite: '#d9dae8'
}

const DEFAULT_FONT_SIZE = 12

const view = {
  active: null,
  last: null,
  fontSize: DEFAULT_FONT_SIZE,
  size: { cols: 120, rows: 36 },
  confirmEnd: null,
  panes: new Map(),
  layouts: new Map(),
  focused: new Map(),
  zoomed: new Map(),
  containers: new Map()
}

const sessionOf = termId => termId.split('~')[0]

/* Panes: one xterm per pty, kept alive while the app runs */

function ensurePane(id) {
  if (view.panes.has(id)) return view.panes.get(id)
  const el = document.createElement('div')
  el.className = 'term-pane'
  el.dataset.term = id
  const host = document.createElement('div')
  host.className = 'term-host'
  el.append(host)

  const term = new Terminal({
    fontFamily: '"SauceCodePro Nerd Font Mono", "SauceCodePro NFM", monospace',
    fontSize: view.fontSize,
    cols: view.size.cols,
    rows: view.size.rows,
    lineHeight: 1.1,
    cursorStyle: 'block',
    cursorBlink: false,
    scrollback: 10000,
    allowProposedApi: true,
    macOptionIsMeta: true,
    theme: terminalTheme
  })
  const fit = new FitAddon.FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon.WebLinksAddon((_event, uri) => act('openUrl', { url: uri })))
  term.open(host)
  term.onData(data => window.atelier.term.input(id, data))
  term.onBinary(data => window.atelier.term.input(id, data))
  term.onResize(({ cols, rows }) => window.atelier.term.resize(id, cols, rows))
  term.attachCustomKeyEventHandler(event => handleKey(event, id))
  term.textarea?.addEventListener('focus', () => setFocused(id))

  const pane = { id, term, fit, el, ready: false }
  view.panes.set(id, pane)
  new ResizeObserver(() => fitPane(pane)).observe(el)
  window.atelier.term.replay(id).then(output => {
    term.write(output)
    pane.ready = true
  })
  return pane
}

function fitPane(pane) {
  if (!pane.el.isConnected || pane.el.offsetParent === null) return
  try {
    pane.fit.fit()
  } catch {}
  const { cols, rows } = pane.term
  if (pane.el.parentElement?.classList.contains('layout') && (cols !== view.size.cols || rows !== view.size.rows)) {
    view.size = { cols, rows }
    window.atelier.term.size(cols, rows)
  }
}

function disposePane(id) {
  const pane = view.panes.get(id)
  if (!pane) return
  pane.term.dispose()
  pane.el.remove()
  view.panes.delete(id)
}

window.atelier.term.onData((id, data) => {
  const pane = view.panes.get(id)
  if (pane?.ready) pane.term.write(data)
})

window.atelier.term.onExit(id => {
  const sid = sessionOf(id)
  if (id !== sid) removeLeaf(sid, id)
  renderSession()
})

/* Layout tree: { t: 'leaf', id } | { t: 'split', dir: 'row' | 'col', ratio, a, b } */

function findParent(node, id, parent = null) {
  if (node.t === 'leaf') return node.id === id ? { node, parent } : null
  return findParent(node.a, id, node) || findParent(node.b, id, node)
}

function leaves(node) {
  return node.t === 'leaf' ? [node.id] : [...leaves(node.a), ...leaves(node.b)]
}

function replaceNode(root, target, replacement) {
  if (root === target) return replacement
  if (root.t === 'split') {
    root.a = replaceNode(root.a, target, replacement)
    root.b = replaceNode(root.b, target, replacement)
  }
  return root
}

function removeLeaf(sid, id) {
  const tree = view.layouts.get(sid)
  if (!tree) return
  const found = findParent(tree, id)
  if (!found) return
  if (found.parent) {
    const sibling = found.parent.a === found.node ? found.parent.b : found.parent.a
    view.layouts.set(sid, replaceNode(tree, found.parent, sibling))
  }
  if (view.zoomed.get(sid) === id) view.zoomed.delete(sid)
  if (view.focused.get(sid) === id) view.focused.set(sid, leaves(view.layouts.get(sid))[0])
  disposePane(id)
  act('closeTerminal', { id })
  layout(sid)
  focusPane(view.focused.get(sid))
}

function container(sid) {
  if (!view.containers.has(sid)) {
    const el = document.createElement('div')
    el.className = 'layout'
    el.dataset.session = sid
    $('terms').append(el)
    view.containers.set(sid, el)
  }
  return view.containers.get(sid)
}

function layout(sid) {
  const tree = view.layouts.get(sid)
  if (!tree) return
  const zoomed = view.zoomed.get(sid)
  const focused = view.focused.get(sid)
  const build = node => {
    if (node.t === 'leaf') {
      const pane = ensurePane(node.id)
      pane.el.classList.toggle('dim', node.id !== focused && leaves(tree).length > 1 && !zoomed)
      return pane.el
    }
    const box = document.createElement('div')
    box.className = `split ${node.dir === 'row' ? 'across' : 'down'}`
    const a = build(node.a)
    const b = build(node.b)
    a.style.flex = `${node.ratio} 1 0`
    b.style.flex = `${1 - node.ratio} 1 0`
    const divider = document.createElement('div')
    divider.className = 'divider'
    divider.addEventListener('mousedown', event => dragDivider(event, sid, node, box, a, b))
    box.append(a, divider, b)
    return box
  }
  const root = zoomed ? ensurePane(zoomed).el : build(tree)
  root.style.flex = '1 1 0'
  if (zoomed) root.classList.remove('dim')
  container(sid).replaceChildren(root)
  requestAnimationFrame(() => leaves(tree).forEach(id => view.panes.has(id) && fitPane(view.panes.get(id))))
}

function dragDivider(event, sid, node, box, a, b) {
  event.preventDefault()
  const rect = box.getBoundingClientRect()
  const move = e => {
    const ratio = node.dir === 'row' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height
    node.ratio = Math.min(0.85, Math.max(0.15, ratio))
    a.style.flex = `${node.ratio} 1 0`
    b.style.flex = `${1 - node.ratio} 1 0`
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    focusPane(view.focused.get(sid))
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function setFocused(id) {
  const sid = sessionOf(id)
  if (view.focused.get(sid) === id) return
  view.focused.set(sid, id)
  const tree = view.layouts.get(sid)
  if (!tree) return
  const many = leaves(tree).length > 1 && !view.zoomed.get(sid)
  for (const leaf of leaves(tree)) view.panes.get(leaf)?.el.classList.toggle('dim', many && leaf !== id)
}

function focusPane(id) {
  const pane = id && view.panes.get(id)
  if (!pane) return
  setFocused(id)
  requestAnimationFrame(() => pane.term.focus())
}

/* Ghostty-style actions */

async function split(fromId, dir) {
  const sid = sessionOf(fromId)
  const tree = view.layouts.get(sid)
  const owner = ui.state?.terminals.find(t => t.id === sid)
  if (!tree || !owner || owner.exited) return
  const result = await act('splitShell', { parent: sid })
  if (!result?.ok) return
  const found = findParent(tree, fromId)
  if (!found) return
  view.zoomed.delete(sid)
  const replacement = { t: 'split', dir, ratio: 0.5, a: found.node, b: { t: 'leaf', id: result.pane } }
  view.layouts.set(sid, replaceNode(tree, found.node, replacement))
  view.focused.set(sid, result.pane)
  layout(sid)
  focusPane(result.pane)
}

function closePane(id) {
  const sid = sessionOf(id)
  if (id !== sid) {
    removeLeaf(sid, id)
    return
  }
  view.confirmEnd = sid
  renderSession()
  document.querySelector('[data-act="end-session"]')?.focus()
}

function gotoSplit(id, direction) {
  const sid = sessionOf(id)
  const tree = view.layouts.get(sid)
  if (!tree || view.zoomed.get(sid)) return
  const ids = leaves(tree)
  if (direction === 'previous' || direction === 'next') {
    const i = ids.indexOf(id)
    focusPane(ids[(i + (direction === 'next' ? 1 : ids.length - 1)) % ids.length])
    return
  }
  const from = view.panes.get(id).el.getBoundingClientRect()
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  let best = null
  for (const other of ids) {
    if (other === id) continue
    const r = view.panes.get(other)?.el.getBoundingClientRect()
    if (!r) continue
    const ox = r.left + r.width / 2
    const oy = r.top + r.height / 2
    const ok = { left: r.right <= from.left + 1, right: r.left >= from.right - 1, up: r.bottom <= from.top + 1, down: r.top >= from.bottom - 1 }[direction]
    if (!ok) continue
    const distance = Math.hypot(ox - cx, oy - cy)
    if (!best || distance < best.distance) best = { id: other, distance }
  }
  if (best) focusPane(best.id)
}

function resizeSplit(id, direction, amount) {
  const sid = sessionOf(id)
  const tree = view.layouts.get(sid)
  if (!tree) return
  const dir = direction === 'left' || direction === 'right' ? 'row' : 'col'
  const sign = direction === 'right' || direction === 'down' ? 1 : -1
  const path = []
  const walk = node => {
    if (node.t === 'leaf') return node.id === id
    if (walk(node.a) || walk(node.b)) {
      path.push(node)
      return true
    }
    return false
  }
  walk(tree)
  const target = path.find(node => node.dir === dir)
  if (!target) return
  target.ratio = Math.min(0.85, Math.max(0.15, target.ratio + sign * amount))
  layout(sid)
  focusPane(id)
}

function toggleZoom(id) {
  const sid = sessionOf(id)
  view.zoomed.get(sid) ? view.zoomed.delete(sid) : view.zoomed.set(sid, id)
  layout(sid)
  focusPane(id)
}

function setFontSize(size) {
  view.fontSize = Math.min(28, Math.max(9, size))
  for (const pane of view.panes.values()) {
    pane.term.options.fontSize = view.fontSize
    fitPane(pane)
  }
}

async function paste(id) {
  const text = await window.atelier.clipboard.read()
  if (text) view.panes.get(id)?.term.paste(text)
}

function copy(id) {
  const selection = view.panes.get(id)?.term.getSelection()
  if (selection) window.atelier.clipboard.write(selection)
}

const namedKeys = {
  Enter: 'enter', Insert: 'insert', PageUp: 'page_up', PageDown: 'page_down', Home: 'home', End: 'end',
  ArrowUp: 'arrow_up', ArrowDown: 'arrow_down', ArrowLeft: 'arrow_left', ArrowRight: 'arrow_right'
}

function keyName(event) {
  if (namedKeys[event.key]) return namedKeys[event.key]
  if (/^[a-z]$/i.test(event.key) || /^[-=+[\]]$/.test(event.key)) return event.key.toLowerCase()
  const digit = event.code.match(/^(?:Digit|Numpad)(\d)$/)
  if (digit) return digit[1]
  return event.key.toLowerCase()
}

function chord(event) {
  return [event.metaKey && 'super', event.ctrlKey && 'ctrl', event.altKey && 'alt', event.shiftKey && 'shift', keyName(event)].filter(Boolean).join('+')
}

const bindings = {
  'ctrl+shift+c': copy,
  'ctrl+insert': copy,
  'ctrl+shift+v': paste,
  'shift+insert': paste,
  'shift+enter': id => window.atelier.term.input(id, '\x1b[13;2u'),
  'alt+shift+enter': id => window.atelier.term.input(id, '\x1b[13;4u'),
  'ctrl+shift+o': id => split(id, 'row'),
  'ctrl+alt+shift+t': id => split(id, 'row'),
  'ctrl+shift+e': id => split(id, 'col'),
  'ctrl+alt+shift+d': id => split(id, 'col'),
  'ctrl+shift+w': closePane,
  'ctrl+alt+shift+w': closePane,
  'super+ctrl+[': id => gotoSplit(id, 'previous'),
  'super+ctrl+]': id => gotoSplit(id, 'next'),
  'ctrl+alt+arrow_up': id => gotoSplit(id, 'up'),
  'ctrl+alt+arrow_down': id => gotoSplit(id, 'down'),
  'ctrl+alt+arrow_left': id => gotoSplit(id, 'left'),
  'ctrl+alt+arrow_right': id => gotoSplit(id, 'right'),
  'super+ctrl+shift+arrow_up': id => resizeSplit(id, 'up', 0.03),
  'super+ctrl+shift+arrow_down': id => resizeSplit(id, 'down', 0.03),
  'super+ctrl+shift+arrow_left': id => resizeSplit(id, 'left', 0.03),
  'super+ctrl+shift+arrow_right': id => resizeSplit(id, 'right', 0.03),
  'super+ctrl+alt+shift+arrow_up': id => resizeSplit(id, 'up', 0.1),
  'super+ctrl+alt+shift+arrow_down': id => resizeSplit(id, 'down', 0.1),
  'super+ctrl+alt+shift+arrow_left': id => resizeSplit(id, 'left', 0.1),
  'super+ctrl+alt+shift+arrow_right': id => resizeSplit(id, 'right', 0.1),
  'ctrl+shift+enter': toggleZoom,
  'ctrl+=': () => setFontSize(view.fontSize + 1),
  'ctrl+shift+=': () => setFontSize(view.fontSize + 1),
  'ctrl++': () => setFontSize(view.fontSize + 1),
  'ctrl+shift++': () => setFontSize(view.fontSize + 1),
  'ctrl+-': () => setFontSize(view.fontSize - 1),
  'ctrl+0': () => setFontSize(DEFAULT_FONT_SIZE),
  'shift+page_up': id => view.panes.get(id)?.term.scrollPages(-1),
  'shift+page_down': id => view.panes.get(id)?.term.scrollPages(1),
  'shift+home': id => view.panes.get(id)?.term.scrollToTop(),
  'shift+end': id => view.panes.get(id)?.term.scrollToBottom(),
  'ctrl+shift+a': id => view.panes.get(id)?.term.selectAll(),
  'ctrl+shift+l': () => showList()
}

function handleKey(event, id) {
  const action = bindings[chord(event)]
  if (!action) return true
  if (event.type === 'keydown') {
    event.preventDefault()
    action(id)
  }
  return false
}

/* Views */

function openSession(sid) {
  if (!ui.state?.terminals.some(t => t.id === sid)) {
    view.pendingOpen = sid
    return
  }
  view.pendingOpen = null
  closeWeb()
  view.active = sid
  view.last = sid
  view.confirmEnd = null
  if (!view.layouts.has(sid)) view.layouts.set(sid, { t: 'leaf', id: sid })
  if (!view.focused.has(sid)) view.focused.set(sid, sid)
  document.body.dataset.view = 'session'
  window.atelier.view('session')
  renderNav()
  for (const [id, el] of view.containers) el.hidden = id !== sid
  layout(sid)
  container(sid).hidden = false
  renderSession()
  focusPane(view.focused.get(sid))
}

function showList() {
  const terminal = ui.state?.terminals.find(t => t.id === view.active)
  view.active = null
  view.confirmEnd = null
  document.body.dataset.view = 'list'
  window.atelier.view('list')
  $('session').hidden = true
  renderNav()
  renderNavSessions()
  if (terminal?.prId) setTab('reviews')
  else if (terminal) setTab('mine')
  const row = terminal?.key && document.querySelector(`[data-ticket="${terminal.key}"] [data-act="claude"]`)
  row?.focus()
}

function sessionStatus(terminal) {
  if (terminal.exited) return ['', 'Ended']
  if (terminal.kind === 'terminal') return ['idle', terminal.id.startsWith('nvim:') ? 'nvim' : 'Shell']
  const s = terminal.session
  if (!s) return ['purple', 'Starting']
  return {
    'needs-you': ['sand', 'Needs you'],
    working: ['purple', 'Working'],
    done: s.seen ? ['idle', 'Finished'] : ['sand', 'Finished, unread'],
    idle: ['idle', 'Idle']
  }[s.status] || ['idle', s.status]
}

function sessionName(t) {
  if (t.key) return `${t.key}${t.id.startsWith('rebase:') ? ' rebase' : ''}`
  if (t.prId) return (t.label.match(/#\d+/) || ['Review'])[0]
  return t.label.replace(/^(Claude|Terminal|nvim) in /, '')
}

function sessionDetail(t) {
  if (t.prId) return t.label.replace(/^Review of [^:]+: /, '')
  if (t.key) return t.label
  if (t.id.startsWith('nvim:')) return 'nvim'
  if (t.kind === 'terminal') return 'Terminal'
  return t.session?.title || t.session?.prompt || 'Claude'
}

function renderNavSessions() {
  const sessions = ui.state?.terminals.filter(t => !t.parent) || []
  const inSession = document.body.dataset.view === 'session'
  $('nav-sessions').innerHTML = sessions.length ? `<h2>Open sessions <span class="count code">${sessions.length}</span></h2>
    <div class="session-list">${sessions.map(t => {
      const [color, label] = sessionStatus(t)
      const current = inSession && t.id === view.active
      const mark = t.kind === 'claude' ? '<span class="dot"></span>' : `<span class="glyph">${t.id.startsWith('nvim:') ? G.edit : G.terminal}</span>`
      return `<button class="${color}" data-act="open-session" data-id="${esc(t.id)}" aria-current="${current ? 'page' : 'false'}" title="${esc(`${t.label} (${label})`)}">
        ${mark}<span class="name code">${esc(sessionName(t))}</span><span class="state">${t.kind === 'claude' || t.exited ? esc(label) : ''}</span><span class="detail">${esc(sessionDetail(t))}</span></button>`
    }).join('')}</div>` : ''
}

function editorButton(state, terminal) {
  if (terminal.kind !== 'claude' || terminal.exited) return ''
  if (state.terminals.some(t => t.id === `${terminal.id}~nvim` && !t.exited)) return ''
  return `<button class="btn quiet" data-act="open-editor" data-id="${esc(terminal.id)}" title="Open nvim beside Claude, in ${esc(terminal.cwd)}"><span class="glyph">${G.edit}</span><span class="t">Open nvim</span></button>`
}

function renderSession() {
  if (view.pendingOpen && ui.state?.terminals.some(t => t.id === view.pendingOpen)) {
    openSession(view.pendingOpen)
    return
  }
  syncTerminals()
  renderNavSessions()
  if (!view.active) return
  const state = ui.state
  const terminal = state.terminals.find(t => t.id === view.active)
  if (!terminal) {
    showList()
    return
  }
  $('session').hidden = false
  const ticket = terminal.key ? state.tickets.find(t => t.key === terminal.key) : null
  const review = terminal.prId ? state.reviews.find(r => r.id === terminal.prId) || null : null
  const [color, label] = sessionStatus(terminal)
  const back = `<button class="back" data-act="show-list" title="Back to the list (Ctrl+Shift+L)">
      <span class="glyph">${G.back}</span><span class="t">${terminal.prId ? 'Reviews' : 'All tickets'}</span></button>`
  const shell = terminal.kind === 'terminal'
  const status = `<span class="chip ${color}">${shell ? `<span class="glyph">${G.terminal}</span>` : `<span class="glyph claude">${G.claude}</span>`}<span class="label">${label}</span></span>`

  let context
  if (ticket) {
    context = `<div class="ticket in-session ${ticket.blocked ? 'blocked' : ''}" data-ticket="${esc(ticket.key)}">
      <div class="head">
        ${back}
        <button class="key code" data-act="open-url" data-url="${esc(ticket.url)}" title="Open ${esc(ticket.key)} in Jira">${esc(ticket.key)}</button>
        <span class="summary" title="${esc(ticket.summary)}">${esc(ticket.summary)}</span>
        ${editorButton(state, terminal)}
        ${timeCell(ticket)}
      </div>
      <div class="body">
        ${track(ticket, state.columns)}
        <span class="column">${esc(ticket.column)}</span>
        ${status}
        ${ticket.pr ? prChip(ticket.pr) : '<span class="no-pr">No pull request yet</span>'}
        <button class="flag ${ticket.blocked ? 'on' : ''}" data-act="flag" data-key="${esc(ticket.key)}" data-blocked="${ticket.blocked ? 0 : 1}"
          title="${ticket.blocked ? 'Remove the blocked flag in Jira' : 'Flag this ticket as blocked in Jira'}">
          <span class="glyph">${G.flag}</span><span class="${ticket.blocked ? 't' : 'flag-text'}">${ticket.blocked ? 'Blocked' : 'Flag as blocked'}</span>
        </button>
      </div>
      ${confirmRow(ticket, state.columns)}
    </div>`
  } else {
    context = `<div class="ticket in-session">
      <div class="head">
        ${back}
        <span class="summary">${esc(terminal.label)}</span>
        ${editorButton(state, terminal)}
        ${review ? `<button class="btn quiet" data-act="open-url" data-url="${esc(review.url)}/files"><span class="glyph">${G.open}</span><span class="t">Open the diff</span></button>` : ''}
      </div>
      <div class="body">${status}</div>
    </div>`
  }
  $('session-bar').innerHTML = context

  const ended = $('ended')
  if (view.confirmEnd === terminal.id && !terminal.exited) {
    ended.hidden = false
    ended.innerHTML = `<span>${shell ? 'Close this terminal?' : 'End this Claude session?'} Its split panes close with it.</span>
      <button class="btn primary" data-act="end-session" data-id="${esc(terminal.id)}">${shell ? 'Close terminal' : 'End session'}</button>
      <button class="btn quiet" data-act="keep-session">Keep it running</button>`
  } else if (terminal.exited) {
    ended.hidden = false
    ended.innerHTML = `<span>${shell ? 'The shell has exited.' : 'Claude has exited.'}</span>
      ${terminal.key ? `<button class="btn primary" data-act="claude" data-key="${esc(terminal.key)}">Resume the session</button>` : ''}
      ${terminal.prId ? `<button class="btn primary" data-act="review-claude" data-id="${esc(terminal.prId)}">Start the review again</button>` : ''}
      <button class="btn quiet" data-act="end-session" data-id="${esc(terminal.id)}">Close</button>`
  } else {
    ended.hidden = true
    ended.innerHTML = ''
  }
}

function syncTerminals() {
  const state = ui.state
  if (!state) return
  const known = new Set(state.terminals.map(t => t.id))
  for (const t of state.terminals) {
    if (!t.parent && !view.layouts.has(t.id)) {
      view.layouts.set(t.id, { t: 'leaf', id: t.id })
      view.focused.set(t.id, t.id)
      container(t.id).hidden = t.id !== view.active
      layout(t.id)
    }
  }
  for (const t of state.terminals) {
    if (t.kind !== 'shell') continue
    const tree = view.layouts.get(t.parent)
    if (!tree) continue
    if (t.exited) {
      if (findParent(tree, t.id)) removeLeaf(t.parent, t.id)
      continue
    }
    if (!findParent(tree, t.id)) {
      const leaf = { t: 'leaf', id: t.id }
      view.layouts.set(t.parent, t.id === `${t.parent}~nvim`
        ? { t: 'split', dir: 'row', ratio: 0.72, a: leaf, b: tree }
        : { t: 'split', dir: 'row', ratio: 0.6, a: tree, b: leaf })
      layout(t.parent)
      if (view.pendingFocus === t.id) {
        view.pendingFocus = null
        focusPane(t.id)
      }
    }
  }
  for (const sid of [...view.layouts.keys()]) {
    if (known.has(sid)) continue
    for (const id of leaves(view.layouts.get(sid))) disposePane(id)
    view.layouts.delete(sid)
    view.focused.delete(sid)
    view.zoomed.delete(sid)
    view.containers.get(sid)?.remove()
    view.containers.delete(sid)
    if (view.last === sid) view.last = null
  }
}

Object.assign(handlers, {
  'show-list': () => showList(),
  'open-session': el => openSession(el.dataset.id),
  'end-session': el => {
    const id = el.dataset.id
    view.confirmEnd = null
    act('closeTerminal', { id })
  },
  async 'open-editor'(el) {
    const sid = el.dataset.id
    const result = await act('openEditor', { parent: sid })
    if (!result?.ok) return
    const tree = view.layouts.get(sid)
    if (tree && findParent(tree, result.pane)) focusPane(result.pane)
    else view.pendingFocus = result.pane
  },
  'keep-session': () => {
    view.confirmEnd = null
    renderSession()
    focusPane(view.focused.get(view.active))
  }
})

document.addEventListener('keydown', event => {
  if (chord(event) !== 'ctrl+shift+l' || event.target.closest('.xterm')) return
  event.preventDefault()
  if (view.active) showList()
  else if (view.last && ui.state?.terminals.some(t => t.id === view.last)) openSession(view.last)
}, true)

window.atelier.onOpenView(id => openSession(id))
