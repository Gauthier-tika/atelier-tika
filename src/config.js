const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const home = os.homedir()
const bundled = name => path.join(__dirname, '..', 'bin', name)
const expand = p => p.replace(/^~(?=$|\/)/, home)

const defaults = {
  jiraBase: 'https://tikamoon.atlassian.net',
  jiraEnv: '~/.config/jira-time/env',
  jiraTimeBin: bundled('jira-time'),
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
  hiddenColumns: [],
  columnColors: {},
  qualifField: 'customfield_10253',
  qualifKubeContext: 'gke_tikamoon-qualif_europe-west1_cluster-tikamoon-qualif',
  githubOrg: 'Tikamoon',
  reviewRepos: [],
  devDir: '~/Dev',
  repoDir: '~/Dev/modulo',
  claudeSessionsBin: bundled('claude-sessions'),
  qualifSyncBin: bundled('qualif-sync'),
  claudeCommand: 'claude',
  startPrompt: '/jira {key}',
  reviewPrompt: '/review {number}',
  pollSeconds: 120,
  theme: null
}

const file = path.join(home, '.config/atelier/config.json')

function readUser() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function load() {
  const user = readUser()
  const config = { ...defaults, ...user, columnLabels: { ...defaults.columnLabels, ...user.columnLabels } }
  for (const key of ['jiraEnv', 'jiraTimeBin', 'devDir', 'repoDir', 'claudeSessionsBin', 'qualifSyncBin'])
    config[key] = expand(config[key])
  return config
}

// Sets (or, with null, removes) top-level keys in the user's config.json, leaving the others as written.
function save(changes) {
  const user = readUser()
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete user[key]
    else user[key] = value
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file + '.tmp', JSON.stringify(user, null, 2) + '\n')
  fs.renameSync(file + '.tmp', file)
}

module.exports = { load, save, home, expand }
