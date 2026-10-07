const fs = require('node:fs')
const path = require('node:path')
const { run, onPath } = require('./run')

// Hyprland, Sway or null (GNOME, KDE…: no window switching), picked from the session's environment.
const desktop = process.env.HYPRLAND_INSTANCE_SIGNATURE ? 'hyprland' : process.env.SWAYSOCK ? 'sway' : null
const sway = desktop === 'sway'

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
  if (!desktop) return []
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
  if (!desktop) return
  const command = sway ? ['swaymsg', [`[con_id=${address}]`, 'focus']]
    : ['hyprctl', ['dispatch', `hl.dsp.focus({ window = "address:${address}" })`]]
  await run(...command, { timeout: 3000 }).catch(() => {})
}

// Tags the window as a terminal (a mark on Sway) so compositor rules can match it.
async function tag(address, on) {
  if (!desktop) return
  if (sway) return run('swaymsg', [`[con_id=${address}]`, on ? 'mark --add terminal' : 'unmark terminal'], { timeout: 3000 })
  return run('hyprctl', ['dispatch', `hl.dsp.window.tag({ tag = "${on ? '+' : '-'}terminal", window = "address:${address}" })`], { timeout: 3000 })
}

const shellCommand = ['-e', '{shell}', '-ic', '{command}']
const shellArgs = ['{shell}', '-ic', '{command}']

// Elsewhere: Ghostty if installed, else the system's x-terminal-emulator when Atelier knows its arguments.
const known = {
  ghostty: { name: 'Ghostty', command: 'ghostty', args: ['--working-directory={dir}', ...shellCommand] },
  terminator: { name: 'Terminator', command: 'terminator', args: ['--working-directory={dir}', '-x', ...shellArgs] },
  'gnome-terminal': { name: 'GNOME Terminal', command: 'gnome-terminal', args: ['--working-directory={dir}', '--', ...shellArgs] },
  ptyxis: { name: 'Ptyxis', command: 'ptyxis', args: ['--new-window', '-d', '{dir}', '--', ...shellArgs] },
  konsole: { name: 'Konsole', command: 'konsole', args: ['--workdir', '{dir}', '-e', ...shellArgs] }
}

function systemTerminal() {
  if (onPath('ghostty')) return known.ghostty
  try {
    const name = path.basename(fs.realpathSync('/etc/alternatives/x-terminal-emulator')).replace(/\.wrapper$/, '')
    if (known[name]) return known[name]
  } catch {}
  return known.ghostty
}

const terminal = {
  hyprland: { name: 'Ghostty', command: 'uwsm-app', args: ['--', 'ghostty', '--working-directory={dir}', ...shellCommand] },
  sway: { name: 'Alacritty', command: 'alacritty', args: ['--working-directory', '{dir}', ...shellCommand] }
}[desktop] || systemTerminal()

module.exports = { desktop, clients, focus, tag, terminal }
