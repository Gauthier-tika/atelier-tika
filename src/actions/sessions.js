const configModule = require('../config')
const claude = require('../claude')
const launch = require('../launch')
const rebase = require('../rebase')
const sapling = require('../sapling')
const wm = require('../wm')
const { run } = require('../run')

module.exports = ({ config, data, terminals, loaders, push, repos, ticketView }) => {
  const editorWindow = () => config.editor.mode === 'window'

  function repoNamed(name) {
    const repo = repos().find(r => r.name === name)
    if (!repo) throw new Error(`${name} is not a repository in ${config.devDir}`)
    return repo
  }

  function openEditorView(repo) {
    const id = `editor:${repo.name}`
    if (!terminals.alive(id)) terminals.spawn(id, { role: 'editor', repo: repo.name, label: `${config.editor.name} in ${repo.name}`, cwd: repo.dir, kind: 'terminal', command: config.editor.command, args: configModule.editorArgs(config.editor, repo.dir) })
    return id
  }

  const actions = {
    async claudeOpen({ key, fresh }) {
      data.past = claude.past()
      const view = ticketView(key)
      const id = `ticket:${key}`
      const embedded = terminals.get(id)
      if (embedded && !embedded.exited && !fresh) return { view: id }
      if (view.session && !view.session.embedded && !fresh) return actions.focusSession({ id: view.session.id })
      if (embedded) terminals.close(id, { keepChildren: true })
      const resume = !fresh && view.previous
      terminals.spawn(id, {
        role: 'ticket',
        key,
        label: view.summary,
        cwd: resume ? launch.directoryFor(config, null, view.previous.cwd) : config.repoDir,
        args: resume ? ['--resume', view.previous.id] : [configModule.fill(config.startPrompt, { key })]
      })
      return { view: id }
    },

    async focusSession({ id }) {
      const session = data.live.find(s => s.id === id)
      const embedded = session && terminals.list().find(t => t.pid === session.pid && !t.exited)
      if (embedded) return { view: embedded.id }
      if (!wm.desktop) throw new Error(`This session runs in ${config.terminal.name}, and Atelier cannot switch windows on this desktop`)
      if (await claude.focus(config, id)) return `Switched to the session in ${config.terminal.name}`
      throw new Error('Its terminal window was not found')
    },

    async rebase({ key }) {
      const view = ticketView(key)
      const pr = view.rebasable
      if (!pr) throw new Error(`${key} has no open pull request in ${config.repoName}`)
      const id = `rebase:${key}`
      if (terminals.alive(id)) return { view: id }
      const spawnClaude = context => terminals.spawn(id, {
        role: 'rebase',
        key,
        prNumber: pr.number,
        label: `Rebase of #${pr.number} onto ${pr.base}`,
        cwd: context.dir,
        args: [rebase.prompt(key, pr, context, { withSapling: data.sapling, repoDir: config.repoDir })]
      })
      const waiting = await rebase.resume(pr)
      if (waiting) {
        spawnClaude(waiting)
        return { view: id, message: `The rebase of #${pr.number} was still waiting on conflicts, Claude picks it up` }
      }
      const result = await rebase.start(config.repoDir, pr)
      if (result.status === 'current') return `#${pr.number} already sits on top of origin/${pr.base}`
      if (result.status === 'pushed') {
        loaders.github()
        return `Rebased #${pr.number} onto origin/${pr.base} and force-pushed it. ${data.sapling ? 'Your local Sapling commit' : `Your local ${pr.branch} branch, if you have one,`} is now the old version`
      }
      spawnClaude(result)
      return { view: id, message: `#${pr.number} conflicts with origin/${pr.base} in ${result.files.length} file${result.files.length > 1 ? 's' : ''}, Claude resolves it` }
    },

    reviewWithClaude({ id }) {
      const pr = data.github?.reviews.find(p => p.id === id) || data.github?.mine.find(p => p.id === id)
      if (!pr) throw new Error('That pull request is no longer listed')
      const termId = `review:${pr.id}`
      if (terminals.alive(termId)) return { view: termId }
      terminals.spawn(termId, {
        role: 'review',
        prId: pr.id,
        prNumber: pr.number,
        title: pr.title,
        repo: pr.repo,
        label: `Review of ${pr.repo}#${pr.number}: ${pr.title}`,
        cwd: launch.directoryFor(config, pr.repo),
        args: [configModule.fill(config.reviewPrompt, { number: pr.number })]
      })
      return { view: termId }
    },

    claudeRepo({ name }) {
      const repo = repoNamed(name)
      const id = terminals.nextId(`repo:${repo.name}:`)
      terminals.spawn(id, { role: 'repo', repo: repo.name, label: `Claude in ${repo.name}`, cwd: repo.dir })
      return { view: id }
    },

    shellRepo({ name }) {
      const repo = repoNamed(name)
      const id = terminals.nextId(`term:${repo.name}:`)
      terminals.spawn(id, { role: 'repo', repo: repo.name, label: `Terminal in ${repo.name}`, cwd: repo.dir, kind: 'terminal' })
      return { view: id }
    },

    async slWeb({ name }) {
      if (!(await sapling.available())) throw new Error('Sapling is not installed, so sl web is not available')
      const repo = repoNamed(name)
      const server = JSON.parse(await run('sl', ['web', '--no-open', '--json'], { cwd: repo.dir, timeout: 30000 }))
      const url = new URL(server.url)
      if (url.protocol !== 'http:' || url.hostname !== 'localhost') throw new Error(`Sapling Web answered on ${url.origin}, not on localhost`)
      return { web: { url: server.url, repo: repo.name } }
    },

    editorRepo({ name }) {
      const repo = repoNamed(name)
      if (editorWindow()) return launch.editorWindow(config.editor, repo.dir)
      return { view: openEditorView(repo) }
    },

    closeTerminal({ id }) {
      terminals.close(id)
      push()
    },

    splitShell({ parent }) {
      return { pane: terminals.spawnShell(parent).id }
    },

    openEditor({ parent }) {
      if (!editorWindow()) return { pane: terminals.spawnEditor(parent).id }
      const owner = terminals.get(parent)
      if (!owner) throw new Error('That session is gone')
      return launch.editorWindow(config.editor, owner.cwd)
    }
  }

  return actions
}
