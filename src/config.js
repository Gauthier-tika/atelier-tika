const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const home = os.homedir()
const expand = p => p.replace(/^~(?=$|\/)/, home)

const defaults = {
  jiraBase: 'https://tikamoon.atlassian.net',
  jiraEnv: '~/.config/jira-time/env',
  jiraTimeBin: '~/.local/bin/jira-time',
  boardId: 17,
  columnLabels: {
    'In Progress / PR': 'In progress',
    'RECETTE PO': 'Recette PO',
    'RECETTE MéTIER': 'Recette métier',
    'A MEPP': 'À MEPP',
    'A MEP': 'À MEP'
  },
  stageColumns: {
    mepp: 'A MEPP',
    mep: 'A MEP'
  },
  unassignedColumn: 'To Do',
  qualifField: 'customfield_10253',
  qualifKubeContext: 'gke_tikamoon-qualif_europe-west1_cluster-tikamoon-qualif',
  githubOrg: 'Tikamoon',
  reviewRepos: [],
  repoDir: '~/Dev/modulo',
  claudeSessionsBin: '~/.local/bin/claude-sessions',
  claudeCommand: 'claude',
  startPrompt: '/jira {key}',
  reviewPrompt: '/review {number}',
  pollSeconds: 120
}

function load() {
  const file = path.join(home, '.config/atelier/config.json')
  let user = {}
  try {
    user = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}
  const config = { ...defaults, ...user, columnLabels: { ...defaults.columnLabels, ...user.columnLabels } }
  for (const key of ['jiraEnv', 'jiraTimeBin', 'repoDir', 'claudeSessionsBin'])
    config[key] = expand(config[key])
  return config
}

module.exports = { load, home, expand }
