const HOT_STATE = 'atelier.hot'

function swapStyles() {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const fresh = link.cloneNode()
    fresh.href = `${link.href.split('?')[0]}?${Date.now()}`
    fresh.addEventListener('load', () => link.remove(), { once: true })
    fresh.addEventListener('error', () => fresh.remove(), { once: true })
    link.after(fresh)
  }
}

window.atelier.onHot((kind, message) => kind === 'css' ? swapStyles() : toast(message, true))

window.addEventListener('pagehide', () => {
  try {
    sessionStorage.setItem(HOT_STATE, JSON.stringify({
      tab: ui.tab,
      session: view.active,
      last: view.last,
      fontSize: view.fontSize,
      layouts: [...view.layouts],
      focused: [...view.focused],
      zoomed: [...view.zoomed]
    }))
  } catch {}
})

;(() => {
  let saved = null
  try {
    saved = JSON.parse(sessionStorage.getItem(HOT_STATE))
    sessionStorage.removeItem(HOT_STATE)
  } catch {}
  if (!saved) return
  setTab(saved.tab)
  view.fontSize = saved.fontSize
  view.pendingOpen = saved.session
  window.atelier.onState(state => {
    if (!saved) return
    const shown = new Set(state.terminals.filter(t => !(t.exited && t.parent)).map(t => t.id))
    const focused = new Map(saved.focused)
    const zoomed = new Map(saved.zoomed)
    for (const [sid, tree] of saved.layouts) {
      if (!leaves(tree).every(id => shown.has(id))) continue
      view.layouts.set(sid, tree)
      if (focused.has(sid)) view.focused.set(sid, focused.get(sid))
      if (zoomed.has(sid)) view.zoomed.set(sid, zoomed.get(sid))
      container(sid).hidden = true
      layout(sid)
    }
    if (shown.has(saved.last)) view.last = saved.last
    saved = null
  })
})()
