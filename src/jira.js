const fs = require('node:fs')
const path = require('node:path')
const { run, env } = require('./run')

function qualifNumber(value) {
  const text = typeof value === 'string' ? value : value?.value || ''
  const match = text.match(/qualif\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

class Jira {
  constructor(config) {
    this.config = config
    this.flagField = null
    this.flagOption = null
    this.columns = null
    this.boardList = null
    this.qualifOptions = null
  }

  reset() {
    this.flagField = null
    this.flagOption = null
    this.columns = null
    this.boardList = null
    this.qualifOptions = null
    this.accountId = null
  }

  account() {
    const values = {}
    let text
    try {
      text = fs.readFileSync(this.config.jiraEnv, 'utf8')
    } catch {
      return null
    }
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*(?:export\s+)?(ATLASSIAN_\w+)\s*=\s*(.*?)\s*$/)
      if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
    return values.ATLASSIAN_EMAIL && values.ATLASSIAN_TOKEN ? { email: values.ATLASSIAN_EMAIL, token: values.ATLASSIAN_TOKEN } : null
  }

  credentials() {
    const account = this.account()
    if (!account) throw new Error('Jira is not connected. Add your e-mail and API token under Settings')
    return account
  }

  saveAccount(file, { base, email, token }) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file + '.tmp', `JIRA_BASE=${base}\nATLASSIAN_EMAIL=${email}\nATLASSIAN_TOKEN=${token}\n`, { mode: 0o600 })
    fs.renameSync(file + '.tmp', file)
  }

  async request(method, path, { params, body, base = this.config.jiraBase, account } = {}) {
    if (!base) throw new Error('No Jira site set. Add it under Settings')
    const { email, token } = account || this.credentials()
    const url = new URL(base + path)
    for (const [key, value] of Object.entries(params || {})) {
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item))
      else url.searchParams.set(key, value)
    }
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000)
    })
    const text = await response.text()
    if (!response.ok) {
      let detail = text.slice(0, 200)
      try {
        const json = JSON.parse(text)
        detail = [...(json.errorMessages || []), ...Object.values(json.errors || {})].join('; ') || detail
      } catch {}
      throw new Error(`Jira ${response.status}: ${detail}`)
    }
    return text ? JSON.parse(text) : {}
  }

  async discoverFlagField() {
    if (this.flagField) return this.flagField
    const fields = await this.request('GET', '/rest/api/3/field')
    this.flagField = fields.find(f => f.name === 'Flagged')?.id || 'customfield_10021'
    return this.flagField
  }

  myself(base, account) {
    return this.request('GET', '/rest/api/3/myself', { base, account })
  }

  async boards() {
    if (this.boardList) return this.boardList
    const boards = []
    let page
    do {
      page = await this.request('GET', '/rest/agile/1.0/board', { params: { startAt: boards.length, maxResults: 50 } })
      boards.push(...page.values)
    } while (!page.isLast && page.values.length)
    this.boardList = boards.map(board => ({ id: board.id, name: board.name, project: board.location?.projectKey || '' }))
    return this.boardList
  }

  async boardId() {
    if (this.config.boardId) return this.config.boardId
    const boards = await this.boards()
    return boards.length === 1 ? boards[0].id : null
  }

  async boardColumns() {
    if (this.columns) return this.columns
    const board = await this.boardId()
    if (!board) return []
    const configuration = await this.request('GET', `/rest/agile/1.0/board/${board}/configuration`)
    this.columns = configuration.columnConfig.columns
      .filter(column => column.statuses.length)
      .map(column => ({
        id: column.name,
        name: this.config.columnLabels[column.name] || column.name,
        statusIds: column.statuses.map(status => status.id)
      }))
    return this.columns
  }

  async tickets(reconcile = []) {
    const flagField = await this.discoverFlagField()
    const fields = ['summary', 'status', 'issuetype', 'priority', 'timespent', 'updated', 'parent', flagField, this.config.qualifField, this.config.verificationField]
    const issues = []
    let nextPageToken
    do {
      const page = await this.request('GET', '/rest/api/3/search/jql', {
        params: {
          jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC',
          fields: fields.join(','),
          maxResults: 100,
          reconcileIssues: reconcile,
          ...(nextPageToken ? { nextPageToken } : {})
        }
      })
      issues.push(...page.issues)
      nextPageToken = page.isLast === false ? page.nextPageToken : null
    } while (nextPageToken)

    return issues.map(issue => {
      const f = issue.fields
      const flag = f[flagField]
      if (Array.isArray(flag) && flag[0]) this.flagOption = flag[0].id
      return {
        id: issue.id,
        key: issue.key,
        summary: f.summary,
        url: `${this.config.jiraBase}/browse/${issue.key}`,
        type: f.issuetype?.name || '',
        priority: f.priority?.name || '',
        status: { id: f.status.id, name: f.status.name, category: f.status.statusCategory?.key },
        epic: f.parent ? { key: f.parent.key, summary: f.parent.fields?.summary || '' } : null,
        blocked: Array.isArray(flag) && flag.length > 0,
        qualif: qualifNumber(f[this.config.qualifField]),
        verification: f[this.config.verificationField]?.value || null,
        timeSpent: f.timespent || 0,
        updated: f.updated
      }
    })
  }

  async unassigned() {
    const statusIds = (await this.boardColumns())
      .filter(c => this.config.unassignedColumns.includes(c.id))
      .flatMap(c => c.statusIds)
    if (!statusIds.length) return []
    const page = await this.request('GET', `/rest/agile/1.0/board/${await this.boardId()}/issue`, {
      params: {
        jql: `assignee is EMPTY AND status in (${statusIds.join(',')}) ORDER BY Rank ASC`,
        fields: 'summary,status,issuetype,priority,updated',
        maxResults: 100
      }
    })
    return page.issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      url: `${this.config.jiraBase}/browse/${issue.key}`,
      type: issue.fields.issuetype?.name || '',
      priority: issue.fields.priority?.name || '',
      status: { id: issue.fields.status.id, name: issue.fields.status.name },
      updated: issue.fields.updated
    }))
  }

  async assignToMe(key) {
    this.accountId ||= (await this.request('GET', '/rest/api/3/myself')).accountId
    await this.request('PUT', `/rest/api/3/issue/${key}/assignee`, { body: { accountId: this.accountId } })
  }

  async moveTo(key, statusIds) {
    const { transitions } = await this.request('GET', `/rest/api/3/issue/${key}/transitions`)
    const transition = transitions.find(t => statusIds.includes(t.to.id))
    if (!transition) throw new Error(`${key} has no transition into that column`)
    await this.request('POST', `/rest/api/3/issue/${key}/transitions`, { body: { transition: { id: transition.id } } })
    return transition.to.name
  }

  async setBlocked(key, blocked) {
    const field = await this.discoverFlagField()
    if (blocked && !this.flagOption) {
      const meta = await this.request('GET', `/rest/api/3/issue/${key}/editmeta`)
      const allowed = meta.fields?.[field]?.allowedValues || []
      this.flagOption = (allowed.find(v => v.value === 'Impediment') || allowed[0])?.id
      if (!this.flagOption) throw new Error(`The Flagged field cannot be edited on ${key}`)
    }
    await this.request('PUT', `/rest/api/3/issue/${key}`, {
      body: { fields: { [field]: blocked ? [{ id: this.flagOption }] : null } }
    })
  }

  async setQualif(key, number) {
    const field = this.config.qualifField
    if (!this.qualifOptions) {
      const meta = await this.request('GET', `/rest/api/3/issue/${key}/editmeta`)
      const allowed = meta.fields?.[field]?.allowedValues || []
      if (!allowed.length) throw new Error(`The Qualif field cannot be edited on ${key}`)
      this.qualifOptions = Object.fromEntries(allowed.map(option => [qualifNumber(option.value), option.id]))
    }
    const id = this.qualifOptions[number]
    if (!id) throw new Error(`Jira has no Qualif ${number} option`)
    await this.request('PUT', `/rest/api/3/issue/${key}`, {
      body: { fields: { [field]: { id } } }
    })
  }

  jiraTime(args) {
    return run('python3', [this.config.jiraTimeBin, ...args], {
      env: { ...env, JIRA_BASE: this.config.jiraBase || '', JIRA_TIME_ENV: this.config.jiraEnv, JIRA_DAILY_HOURS: String(this.config.dailyHours) }
    })
  }

  async week() {
    const output = await this.jiraTime(['week'])
    const data = JSON.parse(output)
    if (data.error) throw new Error(data.error)
    const today = data.today
    const byTicket = {}
    for (const ticket of data.tickets) byTicket[ticket.key] = { today: ticket.days[today] || 0, week: ticket.total }
    return {
      today: data.days.find(day => day.date === today)?.total || 0,
      week: data.total,
      dailyTarget: data.dailyTarget,
      weeklyTarget: data.weeklyTarget,
      byTicket
    }
  }

  async log(key, seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60))
    let output
    try {
      output = await this.jiraTime(['log', key, `${minutes}m`])
    } catch (error) {
      output = error.stdout
    }
    const data = JSON.parse(output || '{}')
    if (!data.ok) throw new Error(data.error || `Could not log time on ${key}`)
    return data
  }
}

module.exports = { Jira }
