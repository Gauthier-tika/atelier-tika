const configModule = require('../config')
const { qualifPlan } = require('../compose')

module.exports = ({ config, data, jira, qualifs, loaders, tickets }) => {
  const actions = {
    qualifAdd({ number }) {
      qualifs.add(number)
      loaders.deploys()
    },

    qualifRemove({ number }) {
      qualifs.remove(number)
      return `Removed ${config.qualif.label} ${number} from Atelier. Its branch and deployment are not touched`
    },

    qualifAssign({ number, key }) {
      if (!tickets().some(t => t.key === key)) throw new Error(`${key} is not in your list`)
      qualifs.assign(number, key)
    },

    qualifUnassign({ number, key }) {
      qualifs.unassign(number, key)
    },

    async qualifSync({ number, deploy }) {
      const settings = config.qualif
      const name = `${settings?.label} ${number}`
      qualifs.get(number)
      await loaders.github()
      if (data.errors.github) throw new Error(`GitHub did not answer (${data.errors.github}), try again`)
      const n = Number(number)
      const plan = qualifPlan(settings, qualifs.get(number), { tickets: tickets(), prs: data.github.mine, repo: config.repoName, login: data.github.viewer })
      const { missing, rows } = plan
      if (missing.length) throw new Error(`${missing.join(', ')} ${missing.length > 1 ? 'have' : 'has'} no open pull request in ${config.repoName}. Remove ${missing.length > 1 ? 'them' : 'it'} or open the PR first`)
      if (deploy && !settings.workflow) throw new Error(`No deploy workflow is set up for ${settings.label.toLowerCase()}s in config.json`)
      const args = [
        String(n), ...plan.toSync.map(pr => String(pr.number)),
        '--base', settings.base, '--branch', plan.qualifBranch || settings.branch, '--max', String(settings.count),
        ...(settings.workflow ? ['--workflow', settings.workflow, ...Object.entries(settings.inputs).flatMap(([key, value]) => ['-f', `${key}=${configModule.fill(value, { n })}`])] : []),
        ...(plan.direct ? ['--direct'] : []),
        deploy ? '--deploy' : '--dry-run'
      ]
      const run = await qualifs.sync(number, {
        bin: config.qualifSyncBin,
        cwd: config.repoDir,
        args,
        prs: plan.toSync,
        branch: plan.branch,
        deploy: Boolean(deploy),
        tickets: plan.keys
      })
      if (!run.ok) throw new Error(`qualif-sync failed on ${name}, see its output`)
      if (!deploy) return `Dry run done for ${name}, nothing pushed or deployed`
      setTimeout(() => loaders.deploys(), 5000)
      const stale = settings.jiraField ? rows.filter(row => row.prs.length && row.jiraQualif !== n).map(row => row.key) : []
      const refused = new Map()
      for (const key of stale) await jira.setQualif(key, n).catch(error => refused.set(key, error.message))
      if (stale.length) loaders.jira()
      const updated = stale.filter(key => !refused.has(key))
      return [
        plan.direct ? `Started the deployment of ${plan.branch} to ${name}` : `Pushed ${plan.branch} and started the deployment to ${name}`,
        updated.length ? `set ${name} in Jira on ${updated.join(', ')}` : '',
        refused.size ? `Jira refused ${[...refused].map(([key, why]) => `${key} (${why})`).join(', ')}` : ''
      ].filter(Boolean).join('; ')
    },

    async qualifCacheClear({ number }) {
      const name = `${config.qualif?.label} ${number}`
      const run = await qualifs.clearCache(number, { cwd: config.repoDir })
      if (run.ok) return `Cleared the cache of ${name}`
      if (/gcloud/i.test(run.output) && /credentials|refresh token|reauth|Unauthorized/i.test(run.output)) throw new Error('gcloud could not sign in. Run gcloud auth login in a terminal, then try again')
      throw new Error(`Clearing the cache of ${name} failed, see its output`)
    }
  }

  return actions
}
