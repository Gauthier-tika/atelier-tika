function renderSettings(state) {
  const section = ui.settingsTab
  $('settings').innerHTML = `<h2 id="settings-title">Settings</h2>
    <div class="subtabs" role="tablist" aria-label="Settings sections">${SETTINGS_TABS.map(tab => `
      <button role="tab" id="settings-tab-${tab.id}" aria-selected="${tab.id === section}" aria-controls="settings-body" data-act="settings-tab" data-section="${tab.id}">${tab.label}</button>`).join('')}
    </div>
    <div id="settings-body" role="tabpanel" aria-labelledby="settings-tab-${section}">${(SETTINGS_TABS.find(tab => tab.id === section) || SETTINGS_TABS[0]).render(state)}</div>`
}

const SETTINGS_TABS = [
  { id: 'global', label: 'Global', render: state => globalSettings(state) },
  { id: 'tickets', label: 'Tickets', render: state => jiraSettings(state) },
  { id: 'qualifs', label: 'Qualifs', render: state => qualifSettings(state) }
]

function globalSettings(state) {
  const current = document.documentElement.dataset.theme || 'default'
  return `<h3>Theme</h3>
    <div class="themes" role="radiogroup" aria-label="Theme">${THEMES.map(theme => `
      <button class="theme-option" role="radio" aria-checked="${theme.id === current}" data-act="set-theme" data-theme="${theme.id}">
        <span class="swatches" aria-hidden="true">${theme.swatches.map(color => `<i style="background: ${color}"></i>`).join('')}</span>
        <span class="t">${esc(theme.label)}</span>
      </button>`).join('')}
    </div>
    <h3>Editor</h3>
    <div class="editors" role="radiogroup" aria-label="Editor">${state.editors.map(editor => `
      <button class="editor-option" role="radio" aria-checked="${editor.current}" data-act="set-editor" data-command="${esc(editor.command)}">
        <span class="t">${esc(editor.name)}</span>
        <span class="hint">${editor.mode === 'window' ? 'Opens its own window' : 'Opens in a pane beside Claude'}</span>
        ${editor.custom ? '<span class="hint">Set in config.json</span>' : ''}
        ${editor.found ? '' : `<span class="hint missing">${esc(editor.command)} not found</span>`}
      </button>`).join('')}
    </div>
    <h3>Repositories</h3>
    <div class="dev-dir">
      <span class="code path">${esc(state.devDir)}</span>
      <button class="btn" data-act="choose-dev-dir" ${ui.busy.has('choose-dev-dir') ? 'disabled' : ''}><span class="glyph">${G.folder}</span><span class="t">Change</span></button>
      <span class="hint">${state.reposPinned ? 'Not used: "repos" in config.json lists the repositories'
        : state.repos.length ? `${plural(state.repos.length, 'repository', 'repositories')}, each a folder right inside it with a .git or .sl directory`
        : 'No repository: Atelier looks for folders right inside it with a .git or .sl directory'}</span>
    </div>`
}

function qualifField({ field, label, value, placeholder = '', hint = '', type = 'text', max }) {
  return `<label class="setting-field"><span class="t">${esc(label)}</span>
    <input type="${type}" data-pick="setting" data-setting="qualif.${field}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" ${type === 'number' ? `min="1" max="${max}"` : ''} autocomplete="off" spellcheck="false">
    ${hint ? `<span class="hint">${hint}</span>` : ''}</label>`
}

function qualifJiraField(settings, connected) {
  const current = settings.values.jiraField
  const fields = settings.fields || []
  const known = !current || fields.some(field => field.id === current)
  return `<label class="setting-field"><span class="t">Jira field</span>
    <select data-pick="setting" data-setting="qualif.jiraField" ${connected && settings.fields ? '' : 'disabled'}>
      <option value="">None</option>
      ${known ? '' : `<option value="${esc(current)}" selected>${esc(current)}</option>`}
      ${fields.map(field => `<option value="${esc(field.id)}" ${field.id === current ? 'selected' : ''}>${esc(field.name)}</option>`).join('')}
    </select>
    <span class="hint">${connected ? 'A select field whose options name the qualif number. Atelier shows it on the tickets and sets it after a deploy' : 'Connect Jira to pick it'}</span></label>`
}

function qualifSettings(state) {
  const settings = state.qualifSettings
  const v = settings.values
  const parts = [`<h3>Qualifs</h3>
    <label class="setting-row toggle">
      <input type="checkbox" data-pick="setting" data-setting="qualif.enabled" ${settings.enabled ? 'checked' : ''}>
      <span>Show the ${esc(v.label)}s tab: test environments that each get a branch rebuilt from a base branch plus the pull requests of their tickets</span>
    </label>`]
  if (!settings.enabled) return parts.join('')
  parts.push(`<div class="setting-fields">
    ${qualifField({ field: 'label', label: 'Name', value: v.label, placeholder: 'Qualif' })}
    ${qualifField({ field: 'count', label: 'How many', value: v.count, type: 'number', max: settings.max, hint: 'Numbered from 1' })}
    ${qualifField({ field: 'url', label: 'Page', value: v.url, placeholder: 'https://qualif{n}.example.com', hint: '<span class="code">{n}</span> becomes the number' })}
    ${qualifField({ field: 'base', label: 'Base branch', value: v.base, placeholder: 'main' })}
    ${qualifField({ field: 'branch', label: 'Branch', value: v.branch, placeholder: 'qualif-{login}-{n}', hint: 'Force-pushed on each sync. <span class="code">{login}</span> becomes your GitHub login' })}
    ${qualifField({ field: 'repo', label: 'GitHub repository', value: v.repo, placeholder: settings.defaultRepo })}
    ${qualifField({ field: 'workflow', label: 'Deploy workflow', value: v.workflow, placeholder: 'deploy.yml', hint: 'Run on the pushed branch. Without it, Sync only pushes' })}
    <label class="setting-field"><span class="t">Workflow inputs</span>
      <textarea data-pick="setting" data-setting="qualif.inputs" rows="2" placeholder="environment=qualif{n}" spellcheck="false">${esc(v.inputs)}</textarea>
      <span class="hint">One <span class="code">name=value</span> per line</span></label>
    ${qualifJiraField(settings, state.jira.connected)}
  </div>
  <div class="setting-row cache-commands"><span class="t">Clear the cache</span>
    ${settings.cache.length ? settings.cache.map(command => `<span class="code">${esc(command)}</span>`).join('') : '<span>Not set up</span>'}
    <span class="hint">The commands come from <span class="code">qualif.cache</span> in config.json</span>
  </div>`)
  return parts.join('')
}

function columnPicks(columns, checked, attrs, taken = new Map()) {
  return `<div class="column-picks">${columns.map(column => {
    const owner = taken.get(column.id)
    return `<label class="column-pick" ${owner ? `title="Already in ${esc(owner)}"` : ''}>
      <input type="checkbox" ${attrs} data-column="${esc(column.id)}" ${checked.includes(column.id) ? 'checked' : ''} ${owner ? 'disabled' : ''}>
      <span>${esc(column.name)}</span>${owner ? `<span class="hint">in ${esc(owner)}</span>` : ''}</label>`
  }).join('')}</div>`
}

function jiraBoard(jira, loading) {
  if (!jira.connected) return '<p class="setting-hint">Connect Jira to pick a board and the columns Atelier uses.</p>'
  if (!jira.boards) return `<p class="setting-hint">${loading ? 'Loading your boards…' : 'Jira did not list your boards. Refresh to try again.'}</p>`
  if (!jira.boards.length) return '<p class="setting-hint">Your Jira account sees no board.</p>'
  if (jira.boards.length === 1) {
    const board = jira.boards[0]
    return `<div class="setting-row"><span class="t">Board</span><span>${esc(board.name)}${board.project ? ` <span class="meta code">(${esc(board.project)})</span>` : ''}</span><span class="hint">The only board your account sees</span></div>`
  }
  return `<label class="setting-row" for="jira-board"><span class="t">Board</span>
    <select id="jira-board" data-pick="jira-board">${jira.boardId ? '' : '<option value="" selected>Pick a board</option>'}${jira.boards.map(board => `
      <option value="${board.id}" ${board.id === jira.boardId ? 'selected' : ''}>${esc(board.name)}${board.project ? ` (${esc(board.project)})` : ''}</option>`).join('')}
    </select></label>`
}

function jiraColumns(jira, loading) {
  if (!jira.connected || !jira.boardId) return ''
  if (!jira.columns.length) return `<p class="setting-hint">${loading ? 'Loading the board columns…' : 'The board shows no column.'}</p>`
  const owners = jira.filters.flatMap((filter, index) => filter.columns.map(column => [column, index]))
  const filtered = new Map(owners.map(([column, owner]) => [column, jira.filters[owner].label]))
  const mine = jira.columns.filter(c => !filtered.has(c.id)).map(c => c.id)
  return `<h3>My tickets</h3>
    <p class="setting-hint">Your tickets in these columns show under My tickets. Columns in a filter show there instead.</p>
    ${columnPicks(jira.columns, jira.mineColumns || mine, 'data-pick="mine-column"', filtered)}
    <h3>Unassigned</h3>
    <p class="setting-hint">Unassigned tickets in these columns show under Unassigned. Check none to hide the tab.</p>
    ${columnPicks(jira.columns, jira.unassignedColumns, 'data-pick="unassigned-column"')}
    <h3>Filters</h3>
    <p class="setting-hint">Each filter is a tab under My tickets. Your tickets in its columns show there instead of in My tickets.</p>
    ${jira.filters.map((filter, index) => {
      const taken = new Map(owners.filter(([, owner]) => owner !== index).map(([column, owner]) => [column, jira.filters[owner].label]))
      return `<div class="filter-edit">
        <div class="filter-head">
          <input class="filter-name" data-pick="filter-label" data-index="${index}" value="${esc(filter.label)}" aria-label="Filter name" spellcheck="false">
          <button class="btn quiet" data-act="filter-remove" data-index="${index}" title="Remove the ${esc(filter.label)} filter"><span class="glyph">${G.cross}</span><span class="t">Remove</span></button>
        </div>
        ${columnPicks(jira.columns, filter.columns, `data-pick="filter-column" data-index="${index}"`, taken)}
      </div>`
    }).join('')}
    <div class="setting-row"><button class="btn" data-act="filter-add"><span class="glyph">${G.plus}</span><span class="t">Add a filter</span></button></div>`
}

function jiraSettings(state) {
  const jira = state.jira
  const draft = ui.jiraDraft
  const busy = ui.busy.has('jira-connect')
  return `<h3>Jira</h3>
    <form class="jira-form" data-form="jira">
      <label><span class="t">Site</span><input data-jira="base" value="${esc(draft.base ?? jira.base)}" placeholder="https://your-team.atlassian.net" autocomplete="off" spellcheck="false"></label>
      <label><span class="t">E-mail</span><input data-jira="email" type="email" value="${esc(draft.email ?? jira.email)}" autocomplete="off" spellcheck="false"></label>
      <label><span class="t">API token</span><input data-jira="token" type="password" value="${esc(draft.token ?? '')}" placeholder="${jira.email ? 'Saved, leave empty to keep it' : 'Create one on id.atlassian.com'}" autocomplete="off"></label>
      <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Connecting…' : jira.connected ? 'Save' : 'Connect'}</button>
      <span class="hint">${jira.legacyFile ? `Atelier reads the e-mail and token from <span class="code">${esc(jira.legacyFile)}</span> for now. ${jira.connected ? 'Save' : 'Connect'} to keep them in <span class="code">${esc(jira.file)}</span> instead, readable only by you.`
        : `${jira.connected ? 'Connected. ' : ''}The e-mail and token stay in <span class="code">${esc(jira.file)}</span>, readable only by you. Time tracking reads them from there too.`}</span>
    </form>
    ${jiraBoard(jira, state.loading.jira)}
    ${jiraColumns(jira, state.loading.jira)}`
}

async function saveSetting(key, value) {
  const result = await act('setSetting', { key, value })
  if (!result?.ok) renderSettings(ui.state)
  return result
}

Object.assign(handlers, {
  async 'set-theme'(el) {
    const theme = el.dataset.theme
    const result = await act('setTheme', { theme })
    if (!result?.ok) return
    document.documentElement.dataset.theme = theme === 'default' ? '' : theme
    applyTerminalTheme()
    renderSettings(ui.state)
  },
  'choose-dev-dir': () => act('chooseDevDir', {}, 'choose-dev-dir'),
  'go-settings': () => {
    ui.settingsTab = 'tickets'
    renderSettings(ui.state)
    setTab('settings')
  },
  'settings-tab'(el) {
    ui.settingsTab = SETTINGS_TABS.some(tab => tab.id === el.dataset.section) ? el.dataset.section : 'global'
    store('atelier.settingsTab', ui.settingsTab)
    renderSettings(ui.state)
  },
  async 'filter-add'() {
    const filters = ui.state.jira.filters
    const result = await saveSetting('filters', [...filters, { label: `Filter ${filters.length + 1}`, columns: [] }])
    if (!result?.ok) return
    const input = document.querySelector(`[data-pick="filter-label"][data-index="${filters.length}"]`)
    input?.focus()
    input?.select()
  },
  'filter-remove': el => saveSetting('filters', ui.state.jira.filters.filter((_, index) => index !== Number(el.dataset.index))),
  'set-editor': el => {
    if (el.getAttribute('aria-checked') !== 'true') act('setEditor', { command: el.dataset.command })
  }
})

const columnToggled = (list, el) => el.checked ? [...list.filter(c => c !== el.dataset.column), el.dataset.column] : list.filter(c => c !== el.dataset.column)
const withFilter = (index, change) => ui.state.jira.filters.map((filter, i) => i === index ? { ...filter, ...change(filter) } : filter)

Object.assign(changes, {
  setting: el => {
    if (el.tagName === 'SELECT') el.blur()
    saveSetting(el.dataset.setting, el.type === 'checkbox' ? el.checked : el.value)
  },
  'filter-label': el => saveSetting('filters', withFilter(Number(el.dataset.index), () => ({ label: el.value }))),
  'filter-column': el => saveSetting('filters', withFilter(Number(el.dataset.index), filter => ({ columns: columnToggled(filter.columns, el) }))),
  'unassigned-column': el => saveSetting('unassignedColumns', columnToggled(ui.state.jira.unassignedColumns, el)),
  'mine-column': el => {
    const jira = ui.state.jira
    const taken = new Set(jira.filters.flatMap(filter => filter.columns))
    const all = jira.columns.map(c => c.id).filter(c => !taken.has(c))
    const next = columnToggled(jira.mineColumns || all, el)
    saveSetting('mineColumns', all.every(c => next.includes(c)) ? null : next)
  },
  'jira-board': el => {
    el.blur()
    if (el.value) act('jiraBoard', { id: Number(el.value) })
  }
})

Object.assign(forms, {
  async jira() {
    document.activeElement?.blur()
    const jira = ui.state.jira
    const draft = ui.jiraDraft
    const result = await act('jiraConnect', { base: draft.base ?? jira.base, email: draft.email ?? jira.email, token: draft.token ?? '' }, 'jira-connect')
    if (result?.ok) {
      ui.jiraDraft = {}
      renderSettings(ui.state)
    }
  }
})

document.addEventListener('input', event => {
  const field = event.target.dataset?.jira
  if (field) ui.jiraDraft[field] = event.target.value
})
