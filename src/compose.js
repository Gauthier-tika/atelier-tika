const { fill } = require('./config')

const KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g

const keysOf = pr => [...new Set(`${pr.branch} ${pr.title}`.toUpperCase().match(KEY) || [])]

function prNeedsYou(pr) {
  if (pr.state !== 'OPEN') return false
  return pr.decision === 'CHANGES_REQUESTED' || ['FAILURE', 'ERROR'].includes(pr.checks) || pr.mergeable === 'CONFLICTING'
}

function claudeNeedsYou(session) {
  return session && (session.status === 'needs-you' || (session.status === 'done' && !session.seen))
}

const stationOf = (columns, ticket) => columns.findIndex(column => column.statusIds.includes(ticket.status.id))
const inProgressStation = columns => columns.findIndex(column => /progress/i.test(column.name))

function qualifPrs(keys, tickets, prs, repo) {
  return keys.map(key => {
    const ticket = tickets.find(t => t.key === key)
    const ticketPrs = prs.filter(pr => pr.repo === repo && keysOf(pr).includes(key))
    const open = ticketPrs.filter(pr => pr.state === 'OPEN').sort((a, b) => a.number - b.number)
    return {
      key,
      summary: ticket?.summary || '',
      url: ticket?.url || null,
      jiraQualif: ticket?.qualif ?? null,
      prs: open,
      merged: !open.length && ticketPrs.some(pr => pr.state === 'MERGED')
    }
  })
}

const sameSync = (a, b) =>
  a.tickets.join() === b.tickets.join() &&
  a.prs.map(pr => `${pr.number}@${pr.head}`).join() === b.prs.map(pr => `${pr.number}@${pr.head}`).join()

const qualifBranch = (settings, login, n) => login || !settings.branch.includes('{login}') ? fill(settings.branch, { login, n }) : null
const syncedBranch = (settings, login, item) => item.synced?.branch || qualifBranch(settings, login, item.number)

function qualifPlan(settings, item, { tickets, prs, repo, login }) {
  const rows = qualifPrs(item.tickets, tickets, prs, repo)
  const toSync = rows.flatMap(row => row.prs.map(pr => ({ number: pr.number, head: pr.head, branch: pr.branch, fork: pr.fork, key: row.key })))
  const direct = Boolean(settings.workflow) && toSync.length === 1 && !toSync[0].fork
  const rebuilt = qualifBranch(settings, login, item.number)
  return {
    rows,
    toSync,
    keys: rows.filter(row => row.prs.length).map(row => row.key),
    missing: rows.filter(row => !row.prs.length && !row.merged).map(row => row.key),
    direct,
    qualifBranch: rebuilt,
    branch: direct ? toSync[0].branch : rebuilt
  }
}

function composeQualifs(data, config) {
  const settings = config.qualif
  if (!settings) return null
  const repo = config.repoName
  const prs = data.github?.mine || []
  const tickets = data.tickets || []
  const viewer = data.github?.viewer
  const items = (data.qualifs || []).map(item => {
    const plan = qualifPlan(settings, item, { tickets, prs, repo, login: viewer })
    const deployed = syncedBranch(settings, viewer, item)
    const n = item.number
    return {
      number: n,
      url: settings.url ? fill(settings.url, { n }) : null,
      branch: plan.branch,
      direct: plan.direct,
      tickets: plan.rows,
      toSync: plan.toSync,
      missing: plan.missing,
      synced: item.synced || null,
      deploy: (deployed && data.deploys?.[deployed]) || null,
      cache: settings.cache && {
        description: fill(settings.cache.description, { n }),
        commands: settings.cache.commands.map(command => fill(command.join(' '), { n }))
      },
      cacheClearedAt: item.cacheClearedAt || null,
      upToDate: Boolean(item.synced && data.github && sameSync(item.synced, { tickets: plan.keys, prs: plan.toSync })),
      last: item.last || null,
      current: item.current || null
    }
  })
  const used = new Set(items.map(item => item.number))
  return {
    label: settings.label,
    base: settings.base,
    deploys: Boolean(settings.workflow),
    jira: Boolean(settings.jiraField),
    cache: Boolean(settings.cache),
    items,
    free: Array.from({ length: settings.count }, (_, i) => i + 1).filter(n => !used.has(n)),
    candidates: tickets
      .filter(ticket => prs.some(pr => pr.repo === repo && pr.state === 'OPEN' && keysOf(pr).includes(ticket.key)))
      .map(ticket => ({ key: ticket.key, summary: ticket.summary, qualif: ticket.qualif ?? null })),
    running: items.find(item => item.current)?.number || null
  }
}

function compose(data, timer, config, terminals = []) {
  const reviewRepos = config.reviewRepos
  const columns = data.columns || []
  const filters = (config.filters || []).map((filter, index) => ({ id: `filter-${index}`, label: filter.label, icon: filter.icon || null, columns: filter.columns }))
  const stageOf = {}
  for (const filter of filters) for (const column of filter.columns) stageOf[column] ??= filter.id
  const inProgress = Math.max(0, inProgressStation(columns))
  const prs = data.github?.mine || []
  const past = data.past || []
  const live = (data.live || []).map(session => {
    const embedded = terminals.find(t => t.pid === session.pid && !t.exited)
    const first = past.find(p => p.id === session.id)?.prompt || ''
    return { ...session, first, ...(embedded ? { embedded: embedded.id, embeddedRole: embedded.role } : {}) }
  })
  const terminalFor = (role, match) => terminals.find(t => t.role === role && Object.entries(match).every(([field, value]) => t[field] === value)) || null
  const runs = (data.runs || []).map(run => {
    const terminal = terminals.find(t => t.id === run.terminal)
    return { ...run, open: Boolean(terminal), running: Boolean(terminal && !terminal.exited) }
  })
  const hidden = new Set(config.hiddenColumns || [])
  const claimed = new Set()
  const claimedPrs = new Set()

  const tickets = (data.tickets || []).map(ticket => {
    const station = stationOf(columns, ticket)
    const column = station >= 0 ? columns[station].name : ticket.status.name
    if (hidden.has(column)) return null
    if (config.mineColumns && station >= 0 && !stageOf[columns[station].id] && !config.mineColumns.includes(columns[station].id)) return null
    const ticketPrs = prs
      .filter(pr => keysOf(pr).includes(ticket.key))
      .sort((a, b) => (a.state === 'OPEN' ? 0 : 1) - (b.state === 'OPEN' ? 0 : 1) || b.updatedAt.localeCompare(a.updatedAt))
    ticketPrs.forEach(pr => claimedPrs.add(pr.id))
    const candidates = live.filter(s => !['rebase', 'review', 'run'].includes(s.embeddedRole))
    const session = candidates.find(s => s.keys.includes(ticket.key)) ||
      candidates.find(s => past.find(p => p.id === s.id)?.keys.includes(ticket.key))
    if (session) claimed.add(session.id)
    const previous = session ? null : past.find(p => p.keys.includes(ticket.key))
    const terminal = terminalFor('ticket', { key: ticket.key })
    const pr = ticketPrs[0] || null
    const rebasable = ticketPrs.find(p => p.state === 'OPEN' && p.repo === config.repoName && p.base) || null
    const rebaseTerminal = terminalFor('rebase', { key: ticket.key, exited: false })
    const rebaseSession = rebaseTerminal ? live.find(s => s.embedded === rebaseTerminal.id) || null : null
    const run = runs.find(r => r.ticket === ticket.key) || null
    const attention = Boolean(claudeNeedsYou(session) || claudeNeedsYou(rebaseSession) || (pr && prNeedsYou(pr)) || run?.status === 'waiting')
    return {
      ...ticket,
      mine: ticket.mine !== false,
      station,
      column,
      tone: config.columnColors?.[column] || null,
      stage: station >= 0 ? stageOf[columns[station].id] || 'mine' : 'mine',
      pr,
      otherPrs: ticketPrs.slice(1),
      session,
      previous,
      terminal,
      rebasable,
      rebase: rebaseTerminal ? { id: rebaseTerminal.id, session: rebaseSession } : null,
      run: run && { id: run.id, label: run.label, status: run.status, terminal: run.terminal },
      attention,
      time: {
        today: data.time?.byTicket?.[ticket.key]?.today || 0,
        unlogged: timer.unlogged[ticket.key] || 0,
        runningSince: timer.running?.key === ticket.key ? timer.running.startedAt : null
      }
    }
  }).filter(Boolean)

  const group = ticket => ticket.station === inProgress ? 0 : ticket.station > inProgress ? 1 : 2
  tickets.sort((a, b) => b.attention - a.attention || group(a) - group(b) || a.blocked - b.blocked || b.updated.localeCompare(a.updated))

  const people = new Map()
  for (const { assignee } of tickets) {
    if (!assignee) continue
    const person = people.get(assignee.id) || { ...assignee, count: 0 }
    person.count++
    people.set(assignee.id, person)
  }

  const looseSessions = live.filter(s => !claimed.has(s.id))
  const loosePrs = prs.filter(pr => pr.state === 'OPEN' && !claimedPrs.has(pr.id))

  const myRepos = new Set(reviewRepos?.length ? reviewRepos : prs.map(pr => pr.repo))
  const reviews = (data.github?.reviews || [])
    .filter(pr => !/\[bot\]$|^dependabot$|^renovate$/.test(pr.author))
    .map(pr => {
      const terminal = terminalFor('review', { prId: pr.id, exited: false })
      const reviewedByMe = pr.myReview && !pr.myReview.stale
      const inMyRepos = myRepos.has(pr.repo)
      return {
        ...pr,
        terminal,
        group: pr.requested && !reviewedByMe ? 'waiting'
          : !inMyRepos ? 'elsewhere'
          : reviewedByMe ? 'reviewed'
          : pr.decision === 'APPROVED' ? 'approved'
          : 'waiting'
      }
    })
  reviews.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const unassigned = (data.unassigned || []).map(ticket => {
    const station = stationOf(columns, ticket)
    return { ...ticket, column: station >= 0 ? columns[station].name : ticket.status.name }
  })

  const runningKey = timer.running?.key
  return {
    columns: columns.map(c => c.name),
    filters: filters.map(({ id, label, icon }) => ({ id, label, icon })),
    inProgress: columns[inProgress]?.name || null,
    tickets,
    people: [...people.values()].sort((a, b) => b.me - a.me || a.name.localeCompare(b.name)),
    unassigned,
    looseSessions,
    loosePrs,
    reviews,
    reviewRepos: [...myRepos],
    githubRepos: data.github?.repos || [],
    terminals: terminals.map(t => ({ ...t, session: live.find(s => s.embedded === t.id) || null })),
    viewer: data.github?.viewer || null,
    qualifs: composeQualifs(data, config),
    runs,
    time: data.time || null,
    timer: {
      running: runningKey ? { ...timer.running, summary: tickets.find(t => t.key === runningKey)?.summary || '' } : null
    },
    errors: data.errors,
    loading: data.loading,
    updated: data.updated
  }
}

module.exports = { compose, qualifPlan, syncedBranch, inProgressStation }
