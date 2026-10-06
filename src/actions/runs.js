const fs = require('node:fs')
const path = require('node:path')
const { env } = require('../run')
const { dir: runsDir } = require('../runs')

module.exports = ({ config, runs, terminals }) => {
  function spawnRun(run, args) {
    const cwd = [run.cwd, config.workflows.find(w => w.id === run.workflow)?.cwd, config.repoDir].find(dir => dir && fs.existsSync(dir))
    terminals.spawn(run.terminal, {
      role: 'run',
      runId: run.id,
      label: run.label,
      cwd,
      args,
      env: {
        ATELIER_RUN_ID: run.id,
        ATELIER_RUNS_DIR: runsDir,
        PATH: `${path.join(__dirname, '..', '..', 'bin')}:${env.PATH}`
      }
    })
  }

  const actions = {
    workflowRun({ id }) {
      const workflow = config.workflows.find(w => w.id === id)
      if (!workflow) throw new Error(`No workflow ${id} in config.json`)
      const live = runs.live(workflow.id)
      if (live) return { view: live.terminal, message: `${workflow.label} is already running` }
      const run = runs.create(workflow)
      spawnRun(run, ['--session-id', run.session, workflow.prompt])
      return { view: run.terminal }
    },

    runResume({ id }) {
      const run = runs.get(id)
      if (!run.session) throw new Error('This run started before Atelier recorded its Claude session')
      if (terminals.alive(run.terminal, { keepChildren: true })) return { view: run.terminal }
      runs.resumed(run.id)
      spawnRun(run, ['--resume', run.session])
      return { view: run.terminal }
    },

    runAnswer({ id, option }) {
      const run = runs.get(id)
      if (!run.question?.options.includes(option)) throw new Error('That question was already answered')
      const terminal = terminals.get(run.terminal)
      if (!terminal || terminal.exited) throw new Error('The run session has ended')
      runs.answered(id, run.question.asked)
      terminals.write(run.terminal, option)
      setTimeout(() => terminals.write(run.terminal, '\r'), 150)
      return `Answered "${option}"`
    },

    runDismiss({ id }) {
      const run = runs.get(id)
      if (terminals.get(run.terminal)?.exited) terminals.close(run.terminal)
      runs.dismiss(id)
    }
  }

  return actions
}
