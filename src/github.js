const path = require('node:path')
const { run } = require('./run')

const searchQuery = `
query($q: String!, $first: Int!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: $first) { nodes { ...pr } }
}
fragment pr on PullRequest {
  id number title url state isDraft headRefName headRefOid baseRefName createdAt updatedAt
  additions deletions changedFiles reviewDecision mergeable
  author { login avatarUrl(size: 64) }
  repository { name nameWithOwner }
  allCommits: commits { totalCount }
  commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }
  latestReviews(first: 10) { nodes { author { login } state submittedAt } }
}`

function shape(pr, viewer) {
  const commit = pr.commits.nodes[0]?.commit
  const reviews = pr.latestReviews.nodes
    .filter(review => review.author)
    .map(review => ({ login: review.author.login, state: review.state, at: review.submittedAt }))
  const mine = reviews.find(review => review.login === viewer)
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    repo: pr.repository.name,
    repoFull: pr.repository.nameWithOwner,
    branch: pr.headRefName,
    head: pr.headRefOid,
    base: pr.baseRefName,
    commitCount: pr.allCommits.totalCount,
    state: pr.state,
    draft: pr.isDraft,
    decision: pr.reviewDecision,
    mergeable: pr.mergeable,
    checks: commit?.statusCheckRollup?.state || null,
    lastPush: commit?.committedDate || pr.updatedAt,
    author: pr.author?.login || 'ghost',
    avatar: pr.author?.avatarUrl || '',
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    additions: pr.additions,
    deletions: pr.deletions,
    files: pr.changedFiles,
    reviews,
    myReview: mine ? { state: mine.state, stale: new Date(mine.at) < new Date(commit?.committedDate || 0) } : null
  }
}

const requestedQuery = `
query($q: String!) {
  search(query: $q, type: ISSUE, first: 50) { nodes { ... on PullRequest { id } } }
}`

async function graphql(query, variables, attempts = 2) {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [name, value] of Object.entries(variables))
    args.push(typeof value === 'number' ? '-F' : '-f', `${name}=${value}`)
  try {
    return JSON.parse(await run('gh', args)).data
  } catch (error) {
    const reason = (error.stderr || error.message).trim().split('\n').pop()
    if (attempts > 1 && /HTTP 5\d\d|timed out/i.test(reason)) return graphql(query, variables, attempts - 1)
    throw new Error(reason)
  }
}

async function pullRequests(config) {
  const org = config.githubOrg
  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
  const [mine, open, requested] = await Promise.all([
    graphql(searchQuery, { q: `is:pr author:@me org:${org} updated:>=${since} sort:updated-desc`, first: 40 }),
    graphql(searchQuery, { q: `is:pr is:open draft:false archived:false -author:@me org:${org} sort:updated-desc`, first: 40 }),
    graphql(requestedQuery, { q: `is:pr is:open review-requested:@me org:${org}` })
  ])
  const viewer = mine.viewer.login
  const requestedIds = new Set(requested.search.nodes.map(node => node.id))
  return {
    viewer,
    mine: mine.search.nodes.filter(node => node.id).map(pr => shape(pr, viewer)),
    reviews: open.search.nodes
      .filter(node => node.id)
      .map(pr => ({ ...shape(pr, viewer), requested: requestedIds.has(pr.id) }))
  }
}

function phaseOf(jobs) {
  if (!jobs.length) return null
  if (jobs.some(job => ['failure', 'timed_out', 'startup_failure'].includes(job.conclusion))) return 'failed'
  if (jobs.some(job => job.conclusion === 'cancelled')) return 'cancelled'
  if (jobs.some(job => job.status !== 'completed')) return 'running'
  if (jobs.every(job => job.conclusion === 'skipped')) return 'skipped'
  return 'done'
}

async function qualifDeploys(config, branches) {
  const repo = `${config.githubOrg}/${path.basename(config.repoDir)}`
  const result = {}
  await Promise.all(branches.map(async branch => {
    const [latest] = JSON.parse(await run('gh', ['run', 'list', '--repo', repo, '--workflow', 'deploy-qualif.yml', '--branch', branch,
      '--limit', '1', '--json', 'databaseId,status,conclusion,url,createdAt,headSha']))
    if (!latest) return
    const { jobs } = JSON.parse(await run('gh', ['run', 'view', String(latest.databaseId), '--repo', repo, '--json', 'jobs']))
    const isBuild = job => /build/i.test(job.name.split(' / ')[0])
    result[branch] = {
      id: latest.databaseId,
      url: latest.url,
      at: latest.createdAt,
      head: latest.headSha,
      status: latest.status,
      conclusion: latest.conclusion || null,
      build: phaseOf(jobs.filter(isBuild)),
      deploy: phaseOf(jobs.filter(job => !isBuild(job))),
      finishedAt: latest.status === 'completed' ? jobs.map(job => job.completedAt).filter(Boolean).sort().pop() || null : null
    }
  }))
  return result
}

module.exports = { pullRequests, qualifDeploys }
