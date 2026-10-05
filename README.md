# Atelier

An Electron desktop app that puts my day-to-day Tikamoon work in one window: Jira tickets, Claude Code sessions, GitHub PRs and reviews, qualif environments and time tracking.

It is built for one setup (Linux with Hyprland, Ghostty and Sapling) and is not meant as a general-purpose tool.

![Atelier with demo data](demo/screenshot.png)

## What it does

- **Tickets**: my board, the MEPP and MEP columns and unassigned tickets from Jira. Move a ticket between columns, flag it, take an unassigned one, log time against it with a timer.
- **Claude sessions**: start or resume a Claude Code session on a ticket in an embedded terminal. Sessions already running in Ghostty are shown too, and Atelier switches to their window.
- **Splits**: Ghostty-style panes inside a session. **Open nvim** puts nvim on the left of Claude, and extra shells split beside it. A pane closes when its program exits.
- **PRs and reviews**: GitHub PRs and their checks, rebase a ticket's PR, start a Claude review of a PR.
- **Qualifs**: which qualif environment holds which ticket, sync the Jira Qualif field, clear a qualif's caches.
- **Repo tools**: open Claude, a shell, nvim or `sl web` in any repo under `~/Dev`.

## Requirements

- Node.js and npm
- `claude` (Claude Code), `gh` (signed in), `sl` (Sapling), `git`
- `kubectl` with access to the qualif cluster, for the qualif actions
- To focus and open windows: `hyprctl`, `ghostty` and `uwsm-app` on Hyprland, or `swaymsg` and `alacritty` on Sway
- `nvim`
- Two helper scripts, not part of this repo: `~/.local/bin/jira-time` (Jira worklogs) and `~/.local/bin/claude-sessions` (lists and focuses running Claude sessions)
- Jira credentials in `~/.config/jira-time/env`:

  ```sh
  ATLASSIAN_EMAIL=you@example.com
  ATLASSIAN_TOKEN=your-api-token
  ```

## Install and run

```sh
npm install
npm start
```

To launch it from anywhere, put a wrapper on your `PATH`:

```sh
#!/usr/bin/env bash
set -euo pipefail
dir="$HOME/Dev/atelier"
exec "$dir/node_modules/.bin/electron" "$dir" --ozone-platform-hint=auto --class=atelier "$@"
```

On distributions that restrict unprivileged user namespaces (Ubuntu 24.04 and later), Electron's sandbox needs the AppArmor profile in `atelier.apparmor`. Fix the path inside it, then load it:

```sh
sudo cp atelier.apparmor /etc/apparmor.d/atelier-electron
sudo apparmor_parser -r /etc/apparmor.d/atelier-electron
```

## Configuration

Defaults live in `src/config.js`. Override any of them in `~/.config/atelier/config.json`:

```json
{
  "repoDir": "~/Dev/modulo",
  "startPrompt": "/jira {key}",
  "reviewPrompt": "/review {number}",
  "pollSeconds": 120
}
```

| Variable | Effect |
|---|---|
| `ATELIER_CLAUDE_BIN` | Command used to start Claude instead of `claudeCommand` |
| `ATELIER_WIDTH`, `ATELIER_HEIGHT` | Initial window size |
| `ATELIER_SHOT` | Save a screenshot to this path (`npm run shot`) |
| `ATELIER_SHOT_TAB`, `ATELIER_SHOT_SESSION` | Tab or session to show in that screenshot |

`npm run shot:demo` regenerates `demo/screenshot.png` from the made-up tickets, PRs and sessions in `demo/shot.js`, without calling Jira or GitHub.

## Terminal shortcuts

| Keys | Action |
|---|---|
| `Ctrl+Shift+O` / `Ctrl+Shift+E` | Split right / down |
| `Ctrl+Shift+W` | Close the pane |
| `Ctrl+Alt+Arrow` | Move to the pane in that direction |
| `Super+Ctrl+[` / `]` | Previous / next pane |
| `Super+Ctrl+Shift+Arrow` | Resize the split (add `Alt` for bigger steps) |
| `Ctrl+Shift+Enter` | Zoom the pane |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Font size up / down / reset |
| `Ctrl+Shift+L` | Back to the ticket list |
