function myReviewFact(pr) {
  if (!pr.myReview) return pr.requested ? '<span>Not reviewed by you</span>' : ''
  if (pr.myReview.stale) return '<span class="mine-stale">New commits since your review</span>'
  if (pr.myReview.state === 'APPROVED') return '<span class="mine-approved">You approved</span>'
  if (pr.myReview.state === 'CHANGES_REQUESTED') return '<span class="mine-changes">You requested changes</span>'
  return '<span>You commented</span>'
}

function reviewRow(pr) {
  const others = pr.reviews.filter(r => r.login !== pr.author && r.login !== ui.state.viewer)
  const approvals = others.filter(r => r.state === 'APPROVED').length
  const old = Date.now() - Date.parse(pr.createdAt) > 3 * 86400000
  return `<article class="review ${pr.group === 'waiting' ? 'waiting' : ''}">
    ${pr.avatar ? `<img class="avatar" src="${esc(pr.avatar)}" alt="">` : '<span class="avatar"></span>'}
    <button class="title" data-act="open-url" data-url="${esc(pr.url)}" title="Open #${pr.number} on GitHub">${esc(pr.title)}</button>
    <div class="facts">
      <span class="who">${esc(pr.author)}</span>
      <span class="code">${esc(pr.repo)}#${pr.number}</span>
      <span class="code"><span class="add">+${pr.additions}</span> <span class="del">−${pr.deletions}</span></span>
      <span class="${old ? 'old' : ''}">${age(pr.createdAt)}</span>
      ${checks(pr)}
      ${approvals ? `<span class="mine-approved">${plural(approvals, 'approval')}</span>` : ''}
      ${myReviewFact(pr)}
    </div>
    <div class="actions">
      <button data-act="open-url" data-url="${esc(pr.url)}/files"><span class="glyph">${G.open}</span><span class="t">Open the diff</span></button>
      <button data-act="review-claude" data-id="${esc(pr.id)}"><span class="glyph">${G.terminal}</span><span class="t">${pr.terminal ? 'Open the review session' : 'Review with Claude'}</span></button>
    </div>
  </article>`
}

function repoFilter(state) {
  const repos = [...new Set(state.reviews.map(pr => pr.repo))].sort((a, b) => a.localeCompare(b))
  if (repos.length < 2) return ''
  const shown = repos.filter(repo => !ui.hiddenRepos.has(repo))
  const label = shown.length === repos.length ? 'All repositories' : shown.length === 1 ? shown[0] : `${shown.length} of ${repos.length} repositories`
  return `<div class="repo-filter">
    <button class="repo-filter-button" data-act="toggle-repo-menu" aria-haspopup="true" aria-expanded="${ui.repoMenu}">${esc(label)}</button>
    ${ui.repoMenu ? `<div class="repo-filter-menu" role="group" aria-label="Repositories">
      ${repos.map(repo => `<label><input type="checkbox" data-pick="review-repo" data-repo="${esc(repo)}" ${ui.hiddenRepos.has(repo) ? '' : 'checked'}> <span class="code">${esc(repo)}</span></label>`).join('')}
      <div class="repo-filter-actions">
        <button class="btn quiet" data-act="repos-all">All</button>
        <button class="btn quiet" data-act="repos-none">None</button>
      </div>
    </div>` : ''}
  </div>`
}

function renderReviews(state) {
  const visible = state.reviews.filter(pr => !ui.hiddenRepos.has(pr.repo))
  const group = name => visible.filter(pr => pr.group === name)
  const waiting = group('waiting')
  const approved = group('approved')
  const reviewed = group('reviewed')
  const elsewhere = group('elsewhere')
  const parts = [`<h2 id="reviews-title">To review <span class="count">${waiting.length || ''}</span></h2>`]
  parts.push(repoFilter(state))
  if (state.reviewRepos.length) parts.push(`<p class="repos">Open pull requests from your teammates in <span class="code">${state.reviewRepos.map(esc).join(', ')}</span>, longest waiting first</p>`)
  if (state.loading.github && !state.reviews.length) {
    parts.push('<p class="empty">Loading open pull requests…</p>')
  } else {
    parts.push(waiting.length ? waiting.map(reviewRow).join('') : '<p class="empty">Nothing is waiting for your review.</p>')
    if (approved.length) {
      parts.push(`<h3>Already approved by others <span class="count">${approved.length}</span></h3>`)
      parts.push(approved.map(reviewRow).join(''))
    }
    if (reviewed.length) {
      parts.push(`<h3>Reviewed by you <span class="count">${reviewed.length}</span></h3>`)
      parts.push(reviewed.map(reviewRow).join(''))
    }
    if (elsewhere.length) {
      if (ui.showElsewhere) {
        parts.push(`<h3>Other repositories <span class="count">${elsewhere.length}</span></h3>`)
        parts.push(elsewhere.map(reviewRow).join(''))
        parts.push('<button class="more" data-act="toggle-elsewhere">Hide other repositories</button>')
      } else {
        parts.push(`<button class="more" data-act="toggle-elsewhere">Show ${elsewhere.length} open pull requests in other repositories</button>`)
      }
    }
  }
  $('reviews').innerHTML = parts.join('')
}

function setHiddenRepos(repos) {
  ui.hiddenRepos = new Set(repos)
  store('atelier.hiddenRepos', JSON.stringify([...ui.hiddenRepos]))
  render()
}

Object.assign(handlers, {
  'toggle-elsewhere': () => {
    ui.showElsewhere = !ui.showElsewhere
    render()
  },
  'toggle-repo-menu': () => {
    ui.repoMenu = !ui.repoMenu
    render()
  },
  'repos-all': () => setHiddenRepos([]),
  'repos-none': () => setHiddenRepos(ui.state.reviews.map(pr => pr.repo)),
  'review-claude': el => act('reviewWithClaude', { id: el.dataset.id })
})

Object.assign(changes, {
  'review-repo': el => {
    const hidden = new Set(ui.hiddenRepos)
    if (el.checked) hidden.delete(el.dataset.repo)
    else hidden.add(el.dataset.repo)
    setHiddenRepos(hidden)
  }
})

document.addEventListener('click', event => {
  if (!ui.repoMenu || event.target.closest('.repo-filter')) return
  ui.repoMenu = false
  render()
})
