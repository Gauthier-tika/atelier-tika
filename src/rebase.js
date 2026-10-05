const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { run } = require('./run')

const root = path.join(os.homedir(), '.local/state/atelier/rebase')
const gitEnv = { ...require('./run').env, GIT_EDITOR: 'true', GIT_PAGER: 'cat', LC_ALL: 'C' }

const git = (cwd, args, timeout = 120000) => run('git', args, { cwd, env: gitEnv, timeout })
const reason = error => (error.stderr || error.stdout || error.message).trim().split('\n').slice(-3).join(' ')

const dirFor = pr => path.join(root, pr.branch.replace(/[^\w.-]/g, '-'))

async function inProgress(dir) {
  if (!fs.existsSync(dir)) return false
  for (const name of ['rebase-merge', 'rebase-apply']) {
    try {
      if (fs.existsSync(path.resolve(dir, (await git(dir, ['rev-parse', '--git-path', name])).trim()))) return true
    } catch {
      return false
    }
  }
  return false
}

async function conflicted(dir) {
  return (await git(dir, ['diff', '--name-only', '--diff-filter=U'])).split('\n').filter(Boolean)
}

async function localAhead(repoDir, pr) {
  try {
    const out = await run('sl', ['log', '-r', 'draft()', '-T', '{node} {github_pull_request_number}\\n'], { cwd: repoDir })
    return out.split('\n').map(line => line.split(' ')).filter(([node, number]) => number === String(pr.number) && node !== pr.head).map(([node]) => node.slice(0, 12))
  } catch {
    return []
  }
}

async function remoteHeads(repoDir, pr) {
  const out = await git(repoDir, ['ls-remote', 'origin', `refs/heads/${pr.base}`, `refs/heads/${pr.branch}`])
  const heads = Object.fromEntries(out.split('\n').filter(Boolean).map(line => line.split('\t').reverse()))
  return { base: heads[`refs/heads/${pr.base}`], head: heads[`refs/heads/${pr.branch}`] }
}

async function resume(pr) {
  const dir = dirFor(pr)
  if (!(await inProgress(dir))) return null
  try {
    return { ...JSON.parse(fs.readFileSync(`${dir}.json`, 'utf8')), files: await conflicted(dir) }
  } catch {
    return null
  }
}

async function removeWorktree(repoDir, dir) {
  fs.rmSync(`${dir}.json`, { force: true })
  if (fs.existsSync(dir)) await git(repoDir, ['worktree', 'remove', '--force', dir]).catch(() => fs.rmSync(dir, { recursive: true, force: true }))
  await git(repoDir, ['worktree', 'prune']).catch(() => {})
}

async function start(repoDir, pr) {
  const ahead = await localAhead(repoDir, pr)
  if (ahead.length) throw new Error(`Your local commit ${ahead[0]} for #${pr.number} differs from the one on GitHub. Push it with sl pr submit first, or rebase it with sl`)

  const remote = await remoteHeads(repoDir, pr)
  if (!remote.base) throw new Error(`origin/${pr.base} does not exist any more`)
  if (remote.head !== pr.head) throw new Error(`${pr.branch} moved on GitHub since Atelier last looked. Refresh and try again`)
  await git(repoDir, ['fetch', '-q', 'origin', `refs/heads/${pr.base}`, `refs/heads/${pr.branch}`])

  if (await git(repoDir, ['merge-base', '--is-ancestor', remote.base, pr.head]).then(() => true, () => false))
    return { status: 'current', base: remote.base }

  const upstream = (await git(repoDir, ['rev-parse', `${pr.head}~${pr.commitCount}`])).trim()
  const [count, merges] = await Promise.all([
    git(repoDir, ['rev-list', '--count', `${upstream}..${pr.head}`]),
    git(repoDir, ['rev-list', '--count', '--merges', `${upstream}..${pr.head}`])
  ])
  if (Number(count) !== pr.commitCount || Number(merges)) throw new Error(`#${pr.number} has merge commits. Rebase it by hand`)

  const dir = dirFor(pr)
  fs.mkdirSync(root, { recursive: true })
  await removeWorktree(repoDir, dir)
  await git(repoDir, ['worktree', 'add', '-q', '--detach', dir, pr.head], 300000)

  const context = { dir, base: remote.base, upstream, oldHead: pr.head }
  try {
    await git(dir, ['rebase', '--onto', remote.base, upstream])
  } catch (error) {
    if (await inProgress(dir)) {
      fs.writeFileSync(`${dir}.json`, JSON.stringify(context))
      return { status: 'conflicts', files: await conflicted(dir), ...context }
    }
    await removeWorktree(repoDir, dir)
    throw new Error(`git rebase failed: ${reason(error)}`)
  }

  const newHead = (await git(dir, ['rev-parse', 'HEAD'])).trim()
  try {
    await git(dir, ['push', '-q', `--force-with-lease=refs/heads/${pr.branch}:${pr.head}`, 'origin', `${newHead}:refs/heads/${pr.branch}`])
  } catch (error) {
    throw new Error(`Rebased in ${dir}, but the push failed: ${reason(error)}`)
  }
  await removeWorktree(repoDir, dir)
  return { status: 'pushed', newHead, ...context }
}

function prompt(key, pr, { upstream, base, oldHead, files = [] }) {
  return [
    `${key}: Atelier started rebasing PR #${pr.number} (${pr.branch}) onto origin/${pr.base} (${base.slice(0, 12)}) in this git worktree, and the rebase stopped on conflicts${files.length ? ` in ${files.join(', ')}` : ''}.`,
    '',
    `1. Resolve each conflict so both intents survive: what landed on ${pr.base}, and what the PR changes. Read the ${pr.base} commits that touched each file first (git log ${upstream.slice(0, 12)}..${base.slice(0, 12)} -- <file>). If a conflict needs a product decision, stop and ask me.`,
    '2. Continue with `git rebase --continue` until the rebase is done, keeping the commit messages.',
    '3. Check what you can from here: `php -l` on changed PHP files, `node --check` on changed JS. Do not run make targets: they act on the main modulo stack, not on this worktree.',
    `4. Show me \`git range-diff ${upstream.slice(0, 12)}..${oldHead.slice(0, 12)} ${base.slice(0, 12)}..HEAD\` and one line per resolved conflict, then wait for my go.`,
    `5. Only after my go: \`git push --force-with-lease=refs/heads/${pr.branch}:${oldHead} origin HEAD:refs/heads/${pr.branch}\`.`,
    '',
    'Use git, not sl, in this worktree: Sapling does not work in git worktrees. Do not touch ~/Dev/modulo.'
  ].join('\n')
}

module.exports = { start, resume, prompt }
