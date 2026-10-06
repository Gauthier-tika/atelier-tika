const terminalTheme = () => themeNamed(document.documentElement.dataset.theme).terminal

function applyTerminalTheme() {
  for (const pane of view.panes.values()) pane.term.options.theme = terminalTheme()
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
    theme: terminalTheme()
  })
  const fit = new FitAddon.FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon.WebLinksAddon((_event, uri) => act('openUrl', { url: uri })))
  const pane = { id, term, fit, el, ready: false, backlog: '' }
  view.panes.set(id, pane)
  term.open(host)
  term.onData(data => pane.ready && window.atelier.term.input(id, data))
  term.onBinary(data => pane.ready && window.atelier.term.input(id, data))
  term.onResize(({ cols, rows }) => pane.ready && window.atelier.term.resize(id, cols, rows))
  term.attachCustomKeyEventHandler(event => handleKey(event, id))
  term.textarea?.addEventListener('focus', () => setFocused(id))

  new ResizeObserver(() => fitPane(pane)).observe(el)
  replay(pane)
  return pane
}

async function replay(pane) {
  await replayOutput(pane).catch(() => {})
  if (view.panes.get(pane.id) !== pane) return
  pane.ready = true
  pane.term.write(pane.backlog)
  pane.backlog = ''
  fitPane(pane)
}

async function replayOutput(pane) {
  const { output, sizes } = await window.atelier.term.replay(pane.id)
  pane.backlog = ''
  for (const [i, size] of sizes.entries()) {
    if (view.panes.get(pane.id) !== pane) return
    pane.term.resize(size.cols, size.rows)
    await new Promise(resolve => pane.term.write(output.slice(size.at, sizes[i + 1]?.at ?? output.length), resolve))
  }
}

function fitPane(pane) {
  if (!pane.ready || !pane.el.isConnected || pane.el.offsetParent === null) return
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
  else if (pane) pane.backlog += data
})

window.atelier.term.onExit(id => {
  const terminal = ui.state?.terminals.find(t => t.id === id)
  if (terminal) terminal.exited = true
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
  window.atelier.view('session', sid)
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
  if (terminal?.role === 'review') setTab('reviews')
  else if (terminal) setTab('mine')
  const row = terminal?.key && document.querySelector(`[data-ticket="${terminal.key}"] [data-act="claude"]`)
  row?.focus()
}

const isEditor = t => t.role === 'editor'
const editorPaneOpen = (state, t) => state.terminals.some(x => x.id === `${t.id}~editor` && !x.exited)

const runOf = t => t.runId ? ui.state?.runs.find(r => r.id === t.runId) || null : null

function sessionStatus(terminal) {
  if (terminal.exited) return ['', 'Ended']
  if (terminal.kind === 'terminal') return ['idle', isEditor(terminal) ? ui.state.editor.name : 'Shell']
  const run = runOf(terminal)
  if (run?.status === 'waiting') return ['sand', 'Needs you']
  const s = terminal.session
  if (run?.live && s?.status === 'done') return ['purple', 'Working']
  if (!s) return ['purple', 'Starting']
  return sessionLook(s, { unread: true })
}

function sessionName(t) {
  if (t.role === 'rebase') return `${t.key} rebase`
  if (t.role === 'ticket') return t.key
  if (t.role === 'review') return `#${t.prNumber}`
  return t.repo || t.label
}

function sessionDetail(t) {
  if (t.role === 'review') return t.title
  const run = runOf(t)
  if (run) return [run.ticket, run.stage].filter(Boolean).join(' · ') || 'Workflow'
  if (t.key) return t.label
  if (isEditor(t)) return ui.state.editor.name
  if (t.kind === 'terminal') return 'Terminal'
  return t.session?.title || t.session?.prompt || 'Claude'
}

function renderNavSessions() {
  const sessions = ui.state?.terminals.filter(t => !t.parent) || []
  const inSession = document.body.dataset.view === 'session'
  paint($('nav-sessions'), sessions.length ? `<h2>Open sessions <span class="count code">${sessions.length}</span></h2>
    <div class="session-list">${sessions.map(t => {
      const [color, label] = sessionStatus(t)
      const current = inSession && t.id === view.active
      const mark = t.kind === 'claude' ? '<span class="dot"></span>' : `<span class="glyph">${isEditor(t) ? G.edit : G.terminal}</span>`
      return `<button class="${color}" data-act="open-session" data-id="${esc(t.id)}" aria-current="${current ? 'page' : 'false'}" title="${esc(`${t.label} (${label})`)}">
        ${mark}<span class="name code">${esc(sessionName(t))}</span><span class="state">${t.kind === 'claude' || t.exited ? esc(label) : ''}</span><span class="detail">${esc(sessionDetail(t))}</span></button>`
    }).join('')}</div>` : '')
}

const shellQuote = value => `'${String(value).replace(/'/g, `'\\''`)}'`

function copyText(text, what) {
  window.atelier.clipboard.write(text)
  toast(`Copied ${what}`)
}

function sessionMenu(t) {
  const state = ui.state
  const ticket = t.key && state.tickets.find(x => x.key === t.key)
  const pr = t.prId ? state.reviews.find(r => r.id === t.prId) : ticket?.pr
  const shell = t.kind === 'terminal'
  const current = document.body.dataset.view === 'session' && view.active === t.id
  const claudeId = t.session?.id
  const run = runOf(t)
  return [
    !current && { label: shell ? 'Open terminal' : 'Open session', run: () => openSession(t.id) },
    ticket && { label: `Open ${t.key} in Jira`, run: () => act('openUrl', { url: ticket.url }) },
    pr && { label: `Open #${pr.number} on GitHub`, run: () => act('openUrl', { url: pr.url }) },
    '-',
    t.kind === 'claude' && !t.exited && !editorPaneOpen(state, t) && { label: editorAction(state, t).menu, run: () => {
      openSession(t.id)
      handlers['open-editor']({ dataset: { id: t.id } })
    } },
    !t.exited && { label: 'Split with a shell', run: () => {
      openSession(t.id)
      split(view.focused.get(t.id), 'row')
    } },
    t.exited && t.key && { label: 'Resume the session', run: () => act('claudeOpen', { key: t.key }) },
    t.exited && t.prId && { label: 'Start the review again', run: () => act('reviewWithClaude', { id: t.prId }) },
    t.exited && run?.session && { label: 'Resume the session', run: () => act('runResume', { id: run.id }) },
    '-',
    { label: 'Copy the directory path', run: () => copyText(t.cwd, 'the directory path') },
    claudeId && { label: 'Copy the resume command', run: () => copyText(`cd ${shellQuote(t.cwd)} && claude --resume ${claudeId}`, 'the resume command') },
    '-',
    { label: t.exited ? 'Close' : shell ? 'Close terminal…' : 'End session…', run: () => endSession(t) }
  ].filter(Boolean).filter((item, i, list) => item !== '-' || (i > 0 && list[i - 1] !== '-' && i < list.length - 1))
}

async function endSession(t) {
  const shell = t.kind === 'terminal'
  if (!t.exited && !await ask({
    message: shell ? `Close ${t.label}?` : `End the Claude session on ${t.label}?`,
    detail: 'Its split panes close with it.',
    confirm: shell ? 'Close terminal' : 'End session',
    cancel: 'Keep it running'
  })) return
  act('closeTerminal', { id: t.id })
}

let closeMenu = () => {}

function showMenu(items, x, y) {
  closeMenu()
  const returnFocus = document.activeElement
  const menu = document.createElement('div')
  menu.className = 'menu'
  menu.popover = 'manual'
  menu.tabIndex = -1
  menu.setAttribute('role', 'menu')
  menu.innerHTML = items.map((item, i) => item === '-' ? '<div role="separator"></div>'
    : `<button role="menuitem" tabindex="-1" data-item="${i}">${esc(item.label)}</button>`).join('')
  const outside = event => {
    if (!menu.contains(event.target)) closeMenu()
  }
  closeMenu = () => {
    closeMenu = () => {}
    document.removeEventListener('pointerdown', outside, true)
    const hadFocus = menu.contains(document.activeElement)
    menu.remove()
    if (hadFocus) returnFocus?.focus()
  }
  document.addEventListener('pointerdown', outside, true)
  menu.addEventListener('click', event => {
    const button = event.target.closest('[data-item]')
    if (!button) return
    closeMenu()
    items[button.dataset.item].run()
  })
  menu.addEventListener('mouseover', event => event.target.closest('[data-item]')?.focus())
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      closeMenu()
      return
    }
    const buttons = [...menu.querySelectorAll('[data-item]')]
    const n = buttons.length
    const i = buttons.indexOf(document.activeElement)
    const target = { ArrowDown: (i + 1) % n, ArrowUp: i < 1 ? n - 1 : i - 1, Home: 0, End: n - 1 }[event.key]
    if (target === undefined) return
    event.preventDefault()
    buttons[target].focus()
  })
  document.body.append(menu)
  menu.showPopover()
  const { width, height } = menu.getBoundingClientRect()
  menu.style.left = `${Math.max(4, Math.min(x, innerWidth - width - 4))}px`
  menu.style.top = `${Math.max(4, Math.min(y, innerHeight - height - 4))}px`
  menu.focus()
}

window.addEventListener('blur', () => closeMenu())

document.addEventListener('contextmenu', event => {
  const el = event.target.closest('[data-act="open-session"]')
  const terminal = el && ui.state?.terminals.find(t => t.id === el.dataset.id)
  if (!terminal) return
  event.preventDefault()
  showMenu(sessionMenu(terminal), event.clientX, event.clientY)
})

function editorAction(state, terminal) {
  const { name, mode } = state.editor
  return mode === 'window'
    ? { menu: `Open in ${name}`, button: `Open in ${name}`, title: `Open ${terminal.cwd} in ${name}` }
    : { menu: `Open ${name} beside Claude`, button: `Open ${name}`, title: `Open ${name} beside Claude, in ${terminal.cwd}` }
}

function editorButton(state, terminal) {
  if (terminal.kind !== 'claude' || terminal.exited || editorPaneOpen(state, terminal)) return ''
  const { button, title } = editorAction(state, terminal)
  return `<button class="btn quiet" data-act="open-editor" data-id="${esc(terminal.id)}" title="${esc(title)}"><span class="glyph">${G.edit}</span><span class="t">${esc(button)}</span></button>`
}

function endButton(terminal) {
  if (terminal.exited) return ''
  const label = terminal.kind === 'terminal' ? 'Close terminal' : 'End session'
  return `<button class="btn quiet" data-act="confirm-end" title="${label} (Ctrl+Shift+W)"><span class="glyph">${G.cross}</span><span class="t">${label}</span></button>`
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
        ${jiraKey(ticket.key, ticket.url)}
        <span class="summary" title="${esc(ticket.summary)}">${esc(ticket.summary)}</span>
        ${editorButton(state, terminal)}
        ${timeCell(ticket)}
        ${endButton(terminal)}
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
        ${status}
        ${editorButton(state, terminal)}
        ${review ? `<button class="btn quiet" data-act="open-url" data-url="${esc(review.url)}/files"><span class="glyph">${G.open}</span><span class="t">Open the diff</span></button>` : ''}
        ${endButton(terminal)}
      </div>
      ${runOf(terminal) ? runQuestion(runOf(terminal)) : ''}
    </div>`
  }
  paint($('session-bar'), context)

  const ended = $('ended')
  if (view.confirmEnd === terminal.id && !terminal.exited) {
    ended.hidden = false
    paint(ended, `<span>${shell ? 'Close this terminal?' : 'End this Claude session?'} Its split panes close with it.</span>
      <button class="btn primary" data-act="end-session" data-id="${esc(terminal.id)}">${shell ? 'Close terminal' : 'End session'}</button>
      <button class="btn quiet" data-act="keep-session">Keep it running</button>`)
  } else if (terminal.exited) {
    ended.hidden = false
    paint(ended, `<span>${shell ? 'The shell has exited.' : 'Claude has exited.'}</span>
      ${terminal.key ? `<button class="btn primary" data-act="claude" data-key="${esc(terminal.key)}">Resume the session</button>` : ''}
      ${terminal.prId ? `<button class="btn primary" data-act="review-claude" data-id="${esc(terminal.prId)}">Start the review again</button>` : ''}
      ${runOf(terminal)?.session ? `<button class="btn primary" data-act="run-resume" data-id="${esc(terminal.runId)}">Resume the session</button>` : ''}
      <button class="btn quiet" data-act="end-session" data-id="${esc(terminal.id)}">Close</button>`)
  } else {
    ended.hidden = true
    paint(ended, '')
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
      view.layouts.set(t.parent, t.id === `${t.parent}~editor`
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
  'confirm-end': () => closePane(view.active),
  'end-session': el => {
    const id = el.dataset.id
    view.confirmEnd = null
    act('closeTerminal', { id })
  },
  async 'open-editor'(el) {
    const sid = el.dataset.id
    const result = await act('openEditor', { parent: sid })
    if (!result?.ok || !result.pane) return
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
  if (chord(event) !== 'ctrl+shift+l' || event.target.closest('.xterm, .menu, dialog')) return
  event.preventDefault()
  if (view.active) showList()
  else if (view.last && ui.state?.terminals.some(t => t.id === view.last)) openSession(view.last)
}, true)

window.atelier.onOpenView(id => openSession(id))
