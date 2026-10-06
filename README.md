# Atelier

An Electron desktop app that puts my day-to-day Tikamoon work in one window: Jira tickets, Claude Code sessions, GitHub PRs and reviews, qualif environments and time tracking.

It is built for one setup (Linux with Hyprland, Ghostty and Sapling) and is not meant as a general-purpose tool. It also runs on Sway, GNOME and other desktops, and without Sapling. Away from Hyprland and Sway, Atelier gets a normal title bar but cannot switch to other windows. Without Sapling, `sl web` is unavailable and git takes over.

![Atelier with demo data](demo/screenshot.png)

## What it does

- **Tickets**: my board, the MEPP and MEP columns and unassigned tickets from Jira. Move a ticket between columns, flag it, take an unassigned one, log time against it with a timer.
- **Claude sessions**: start or resume a Claude Code session on a ticket in an embedded terminal. Sessions already running in another terminal are shown too, and on Hyprland or Sway Atelier switches to their window.
- **Splits**: Ghostty-style panes inside a session. **Open nvim** puts nvim, or the [editor](#editor) you set, on the left of Claude, and extra shells split beside it. A pane closes when its program exits.
- **PRs and reviews**: GitHub PRs and their checks, rebase a ticket's PR, start a Claude review of a PR.
- **Qualifs**: which qualif environment holds which ticket, sync the Jira Qualif field, clear a qualif's caches.
- **Workflows**: start a Claude Code run from a button, follow its stages, answer its questions from Atelier and see its outcome and pull request. See [Workflows](#workflows).
- **Repo tools**: open Claude, a shell or your editor in any repo under `~/Dev`, and `sl web` when Sapling is installed. Pick another folder under **Settings**, saved as `devDir`.

## Requirements

- Node.js and npm
- `claude` (Claude Code), `gh` (signed in), `git`, `python3`, `bash` 4 or later
- An editor: `nvim` by default, any other through `editor` (see [Editor](#editor))
- `kubectl` with access to the qualif cluster, for the qualif actions
- Optional: `sl` (Sapling), for `sl web`; without it Atelier uses git
- Optional, to switch windows: `hyprctl` on Hyprland or `swaymsg` on Sway
- Optional, a [terminal](#terminal): Ghostty (through `uwsm-app` on Hyprland) by default, Alacritty on Sway
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

To launch it from anywhere, link the launcher onto your `PATH`. It finds the app from its own location:

```sh
ln -s "$PWD/bin/atelier" ~/.local/bin/atelier
```

On GNOME, KDE and other desktops with an app launcher, also install the desktop entry. It runs `atelier` from your `PATH`, so link the launcher first:

```sh
cp atelier.desktop ~/.local/share/applications/
```

## Bundled scripts

`bin/` ships the helpers Atelier calls. Atelier runs them from there; `claudeSessionsBin`, `qualifSyncBin` and `jiraTimeBin` point elsewhere if needed.

| Script | Role |
|---|---|
| `bin/atelier` | Launcher |
| `bin/claude-sessions` | Tracks running Claude sessions through Claude Code hooks, lists them and focuses their window |
| `bin/jira-time` | Reads the week's Jira worklogs and logs time. Atelier passes it `jiraBase` and `jiraEnv` |
| `bin/atelier-run` | Lets a workflow run report its stage, ticket, questions and outcome to Atelier |
| `bin/qualif-sync` | Rebuilds `qualif-<github-login>-<N>` from `origin/staging` plus your PRs, pushes it and starts the deployment |

Atelier only sees Claude sessions once the hook is registered. Add this to `~/.claude/settings.json` for each of `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `Stop` and `StopFailure`, with the path to your clone:

```json
{ "hooks": [{ "type": "command", "command": "~/Dev/atelier/bin/claude-sessions hook", "timeout": 5 }] }
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
  "devDir": "~/Dev",
  "repoDir": "~/Dev/modulo",
  "startPrompt": "/jira {key}",
  "reviewPrompt": "/review {number}",
  "pollSeconds": 120
}
```

Atelier lists as repositories the folders right inside `devDir` that hold a `.git` or `.sl` directory. Change `devDir` under **Settings**, or list the repositories yourself with `"repos": ["~/work/shop", "~/work/infra"]`, which takes precedence. `repoDir` is where ticket sessions start.

`hiddenColumns` drops tickets in those columns from the lists, for example `["Time Report"]`. `columnColors` tints a ticket by its column, with `orange` or `green`, for example `{ "In progress": "orange", "Recette PO": "green" }`. Both use the column names Atelier shows.

| Variable | Effect |
|---|---|
| `ATELIER_CLAUDE_BIN` | Command used to start Claude instead of `claudeCommand` |
| `ATELIER_WIDTH`, `ATELIER_HEIGHT` | Initial window size |
| `ATELIER_SHOT` | Save a screenshot to this path (`npm run shot`) |
| `ATELIER_SHOT_TAB`, `ATELIER_SHOT_SESSION` | Tab or session to show in that screenshot |

`npm run shot:demo` regenerates `demo/screenshot.png` from the made-up tickets, PRs and sessions in `demo/shot.js`, without calling Jira or GitHub.

Pick a theme under **Settings**, Atelier, [Nord](https://www.nordtheme.com) or Light. It applies to the app and its terminals at once, and is saved as `"theme"` in `~/.config/atelier/config.json`.

### Editor

Pick the editor behind the **Open nvim** and **nvim** buttons under **Settings**: nvim, Vim, Helix, PhpStorm, VS Code or Zed. The buttons take its name, and the choice is saved as `"editor"` in `~/.config/atelier/config.json`.

Any other editor goes in that file. `{dir}` in `args` becomes the session or repo directory, which is also the editor's working directory. A terminal editor runs in a pane (`"mode": "pane"`, the default):

```json
{ "editor": { "command": "hx", "args": ["."] } }
```

A graphical editor opens in its own window (`"mode": "window"`), and the session button becomes **Open in PhpStorm**:

```json
{ "editor": { "name": "PhpStorm", "command": "phpstorm", "args": ["{dir}"], "mode": "window" } }
```

`name` defaults to the command's file name.

### Terminal

Atelier opens a Claude session in its own window with the terminal under `"terminal"` in `~/.config/atelier/config.json`, and names that terminal when it shows sessions running outside Atelier. Without one, it uses Ghostty through `uwsm-app` on Hyprland, Alacritty on Sway and Ghostty elsewhere.

In `args`, `{dir}` becomes the session directory, `{shell}` your `$SHELL` and `{command}` the command to run in it. Pass `{command}` to the shell with `-ic`, so that your `PATH` and aliases apply:

```json
{ "terminal": { "name": "kitty", "command": "kitty", "args": ["--directory", "{dir}", "{shell}", "-ic", "{command}"] } }
```

```json
{ "terminal": { "name": "Ptyxis", "command": "ptyxis", "args": ["--new-window", "-d", "{dir}", "--", "{shell}", "-ic", "{command}"] } }
```

`name` defaults to the command's file name.

## Workflows

A workflow is a prompt that Atelier starts in its own Claude session, from a button under the repo picker. Atelier does not know what the prompt does: the run tells it through `atelier-run`. List them in `~/.config/atelier/config.json`:

```json
{
  "workflows": [
    { "id": "autopilot", "label": "Solve the next ticket", "prompt": "/ticket-autopilot", "cwd": "~/Dev/modulo", "description": "Triage, take and solve the top To Do ticket" }
  ]
}
```

`cwd` defaults to `repoDir`. Only one run of a workflow goes at a time: the button opens the running one.

Atelier starts the session with `ATELIER_RUN_ID` and `ATELIER_RUNS_DIR` set and its `bin/` first on `PATH`, so the prompt, and the subagents it starts, can call:

| Command | Effect in Atelier |
|---|---|
| `atelier-run stage "<text>"` | Shows the stage and how long it has run |
| `atelier-run ticket <KEY>` | Links the run to a ticket, which shows a Workflow tag |
| `atelier-run ask "<question>" "<option>"…` | Shows the question with one button per option. A button types the option into the session and presses Enter, so the prompt should stop and wait for that reply |
| `atelier-run done [--pr <url>] [--message <text>]` | Marks the run done, with its pull request |
| `atelier-run skip "<reason>"` / `atelier-run fail "<reason>"` | Marks the run skipped or failed |

Each run starts its own Claude session. Once that session has exited, **Resume the session** on the run, or on its ended session, opens it again with `claude --resume` and the same run variables, so the run can keep reporting. Runs started before Atelier recorded their session cannot be resumed.

Outside Atelier, `atelier-run` records nothing and exits 0, so a prompt can call it unconditionally. Runs live in `~/.local/state/atelier/runs/<id>.json` for 14 days. A run whose session exits before `done`, `skip` or `fail` shows as Ended.

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
