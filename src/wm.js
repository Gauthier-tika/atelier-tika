const { run, detach } = require('./run')

// Hyprland or Sway, picked from the session's environment.
const sway = !process.env.HYPRLAND_INSTANCE_SIGNATURE && !!process.env.SWAYSOCK

function swayWindows(node, focus = [], out = []) {
  if (node.pid && (node.type === 'con' || node.type === 'floating_con'))
    out.push({ address: node.id, class: node.app_id || node.window_properties?.class || '', pid: node.pid, focused: !!node.focused, order: focus })
  for (const child of [...(node.nodes || []), ...(node.floating_nodes || [])])
    swayWindows(child, [...focus, (node.focus || []).indexOf(child.id)], out)
  return out
}

const byFocus = (a, b) => {
  for (let i = 0; i < Math.max(a.order.length, b.order.length); i++)
    if ((a.order[i] ?? 0) !== (b.order[i] ?? 0)) return (a.order[i] ?? 0) - (b.order[i] ?? 0)
  return 0
}

// Windows as { address, class, pid, recency }, lowest recency focused last.
async function clients() {
  try {
    if (sway) {
      const windows = swayWindows(JSON.parse(await run('swaymsg', ['-t', 'get_tree', '-r'], { timeout: 3000 }))).sort(byFocus)
      return windows.map((w, i) => ({ address: w.address, class: w.class, pid: w.pid, recency: i }))
    }
    const list = JSON.parse(await run('hyprctl', ['clients', '-j'], { timeout: 3000 }))
    return list.map(c => ({ address: c.address, class: c.class, pid: c.pid, recency: c.focusHistoryID }))
  } catch {
    return []
  }
}

async function focus(address) {
  const command = sway ? ['swaymsg', [`[con_id=${address}]`, 'focus']]
    : ['hyprctl', ['dispatch', `hl.dsp.focus({ window = "address:${address}" })`]]
  await run(...command, { timeout: 3000 }).catch(() => {})
}

// Tags the window as a terminal (a mark on Sway) so compositor rules can match it.
async function tag(address, on) {
  if (sway) return run('swaymsg', [`[con_id=${address}]`, on ? 'mark --add terminal' : 'unmark terminal'], { timeout: 3000 })
  return run('hyprctl', ['dispatch', `hl.dsp.window.tag({ tag = "${on ? '+' : '-'}terminal", window = "address:${address}" })`], { timeout: 3000 })
}

function openTerminal(directory, shell, command) {
  if (sway) detach('alacritty', ['--working-directory', directory, '-e', shell, '-ic', command])
  else detach('uwsm-app', ['--', 'ghostty', `--working-directory=${directory}`, '-e', shell, '-ic', command])
}

module.exports = { sway, clients, focus, tag, openTerminal }
