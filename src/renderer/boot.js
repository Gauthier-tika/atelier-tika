window.atelier.onState(state => {
  ui.state = state
  if (ui.confirm && confirmStillApplies[ui.confirm.type]?.(ui.confirm, state) === false) ui.confirm = null
  render()
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
