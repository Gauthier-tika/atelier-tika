const { dialog } = require('electron')
const configModule = require('../config')
const { THEMES, themeNamed } = require('../themes')

module.exports = ({ config, data, jira, terminals, qualifs, loaders, push, window, repos, resetRepos }) => {
  const reloads = {
    jira() {
      jira.qualifOptions = null
      loaders.jira()
    },
    deploys() {
      data.deploys = null
      loaders.deploys()
    }
  }

  const actions = {
    setTheme({ theme }) {
      if (!THEMES.some(t => t.id === theme)) throw new Error(`Unknown theme ${theme}`)
      config.theme = theme === 'default' ? null : theme
      configModule.save({ theme: config.theme })
      window().setBackgroundColor(themeNamed(theme).terminal.background)
    },

    setEditor({ command }) {
      const editor = configModule.editors.find(e => e.command === command)
      if (!editor) throw new Error(`Unknown editor ${command}`)
      configModule.save({ editor: editor === configModule.editors[0] ? null : editor })
      config.editor = { ...editor }
      terminals.editor = config.editor
      push()
    },

    async jiraConnect({ base, email, token }) {
      let site = String(base || '').trim().replace(/\/+$/, '')
      if (site && !/^https?:\/\//.test(site)) site = `https://${site}`
      let origin
      try {
        origin = new URL(site).origin
      } catch {
        throw new Error('Enter the Jira site, such as https://your-team.atlassian.net')
      }
      email = String(email || '').trim()
      const saved = jira.account()
      token = String(token || '').trim() || (saved?.email === email ? saved.token : '')
      if (!email) throw new Error('Enter the e-mail of your Atlassian account')
      if (!token) throw new Error('Enter an API token for that account')
      const me = await jira.myself(origin, { email, token })
      const file = config.jiraEnvLegacy ? configModule.jiraEnvFile : config.jiraEnv
      jira.saveAccount(file, { base: origin, email, token })
      config.jiraEnv = file
      config.jiraEnvLegacy = false
      const siteChanged = config.jiraBase !== origin
      config.jiraBase = origin
      if (siteChanged) config.boardId = null
      configModule.save({ jiraBase: origin, ...(siteChanged ? { boardId: null } : {}) })
      jira.reset()
      Object.assign(data, siteChanged ? { boards: null, columns: null, tickets: null, unassigned: null } : {})
      loaders.jira()
      loaders.time()
      return `Connected to ${new URL(origin).host} as ${me.displayName || email}`
    },

    jiraBoard({ id }) {
      const board = data.boards?.find(b => b.id === Number(id))
      if (!board) throw new Error('That board is no longer listed')
      config.boardId = board.id
      configModule.save({ boardId: board.id })
      jira.columns = null
      data.columns = null
      data.unassigned = null
      loaders.jira()
      return `Atelier now sorts your tickets by the columns of ${board.name}`
    },

    setSetting({ key, value }) {
      const reload = configModule.setSetting(config, key, value)
      qualifs.settings = config.qualif
      for (const name of reload) reloads[name]()
      push()
    },

    async chooseDevDir() {
      const { canceled, filePaths } = await dialog.showOpenDialog(window(), {
        title: 'Folder that holds your repositories',
        defaultPath: config.devDir,
        properties: ['openDirectory']
      })
      if (canceled || !filePaths.length) return
      config.devDir = filePaths[0]
      resetRepos()
      const shown = configModule.tilde(config.devDir)
      configModule.save({ devDir: shown })
      push()
      const count = repos().length
      return count ? `Found ${count} ${count === 1 ? 'repository' : 'repositories'} in ${shown}` : `No repository in ${shown}`
    }
  }

  return actions
}
