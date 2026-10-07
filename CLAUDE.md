# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Atelier is an Electron desktop app that gathers Jira tickets, Claude Code sessions, GitHub PRs, qualif environments and time tracking in one window. It targets one Linux setup (Hyprland, Ghostty, Sapling) but degrades on Sway, GNOME and without Sapling. `README.md` documents every user-facing setting.

## Commands

```sh
npm install
npm start                       # run the app
npm test                        # node --test, runs test/*.test.js
node --test test/compose.test.js                      # one file
node --test --test-name-pattern="filter" test/*.test.js   # tests whose name matches (pass files, not the folder)
npm run shot:demo               # regenerate demo/screenshot.png from demo/fixture.js, no Jira/GitHub calls
```

There is no build step, bundler, linter or TypeScript. Plain CommonJS, no semicolons, single quotes, 2-space indent.

## Architecture

**Main process owns all state; the renderer only paints it.**

- `src/main.js` holds a single `data` object (Jira, GitHub, deploys, Claude sessions, time). `loaders.*` fill it through `load()`, which dedupes concurrent calls and records `loading`/`errors`/`updated` per source.
- `state()` runs `compose()` from `src/compose.js` over `data` + config + terminals, and `push()` sends the result on the `state` IPC channel. Call `schedulePush()` to batch pushes (150 ms).
- `src/compose.js` is pure: it sorts tickets, attaches PRs and sessions, and plans qualif deploys (`qualifPlan`). Most tests target it, using `demo/fixture.js` as data.

**Actions.** The renderer calls `window.atelier.action(name, payload)` (`src/preload.js`). One `ipcMain.handle('action')` dispatches to the `actions` map in `main.js`, built from `src/actions/<domain>.js`. Each domain module is a function taking the shared `ctx` (config, data, jira, loaders, push, terminals…) and returning named actions. An action returns a string (shown as a toast) or an object, and throws to report an error. `test/actions.test.js` fails if two domains define the same action name.

**Renderer.** `src/renderer/index.html` loads plain scripts in order, sharing globals (no modules, no framework): `app.js` (icons `G`, `ui` state, `paint()`), then `views/*.js` (one per pane), `session.js` (xterm panes and splits), `boot.js` (subscribes to `state`). `paint()` only rewrites a pane when its HTML string changed. The window runs with `contextIsolation` and `sandbox`, and a strict CSP.

**Shared between both sides.** `src/themes.js` is loaded by Node (`require`) and by the renderer (`<script>`); it guards `module.exports` with `typeof module`. Keep it free of Node APIs.

**Terminals.** `src/terminals.js` runs every embedded pty (Claude, shells, editor panes) with `@lydell/node-pty`, keeps a scrollback buffer per terminal for replay after a reload, and gives each one a `role`.

**External integrations.**
- `src/jira.js`: Jira Cloud REST, credentials from the `jiraEnv` file.
- `src/github.js`: shells out to `gh`.
- `src/claude.js`: live sessions come from `bin/claude-sessions list`, fed by Claude Code hooks (see README); past sessions from `~/.claude/projects`.
- `src/wm.js`: Hyprland/Sway window switching; `wm.desktop` is null elsewhere.
- `src/run.js`: `run`/`detach` helpers with an extended `PATH`, plus shell `quote`.

**Bundled helpers in `bin/`** are Python (`claude-sessions`, `jira-time`, `atelier-run`) or bash (`qualif-sync`, `atelier`). Atelier passes them everything they need as arguments; they do not read Atelier's config.

**Files on disk.**
- `~/.config/atelier/config.json`: user overrides of `defaults` in `src/config.js`. `config.load()` merges and cleans them; `config.save()` writes back only the changed keys. Settings editable from the UI are described once in the `settings` table of `config.js`.
- `~/.config/atelier/jira.env`: Jira e-mail and token.
- `~/.local/state/atelier/`: qualif state (`qualifs.json`), workflow runs (`runs/`, `run-marks.json`).
- Write JSON through `src/store.js` (`writeJson` is atomic via a `.tmp` rename).

**Demo mode.** `demo/shot.js` stubs `config`, `jira` and `github` in `require.cache`, then loads `main.js`. Keep those module interfaces in sync with the stubs when changing them.

## Conventions

- Commit messages: short imperative sentence describing the effect (`Share the time logging helpers`), no prefix.
- README and UI text are in English.
