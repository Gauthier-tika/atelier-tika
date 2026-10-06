const { inProgressStation } = require('../compose')
const { run } = require('../run')

module.exports = ({ data, jira, timer, loaders, push, tickets }) => {
  const ticket = key => tickets().find(t => t.key === key)

  function timeChanged() {
    run('qs', ['ipc', '-c', 'desktop', 'call', 'desktop', 'refresh'], { timeout: 5000 }).catch(() => {})
    loaders.time()
    loaders.jira()
  }

  function checkDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) throw new Error('Enter a duration between 1 minute and 24 hours')
  }

  function checkEntry(id) {
    if (!/^\d+$/.test(String(id))) throw new Error('Unknown time entry')
  }

  const actions = {
    async take({ key }) {
      const item = data.unassigned?.find(t => t.key === key)
      if (!item) throw new Error(`${key} is no longer unassigned`)
      const column = data.columns?.[inProgressStation(data.columns)]
      if (!column) throw new Error('The board has no In progress column')
      await jira.assignToMe(key)
      let status
      try {
        status = await jira.moveTo(key, column.statusIds)
      } catch (error) {
        await loaders.jira([item.id])
        throw new Error(`Assigned ${key} to you, but could not move it: ${error.message}`)
      }
      await loaders.jira([item.id])
      return `Assigned ${key} to you and moved it to ${status}`
    },

    async move({ key, station }) {
      const column = data.columns?.[station]
      if (!column || !ticket(key)) throw new Error('Unknown ticket or column')
      const status = await jira.moveTo(key, column.statusIds)
      await loaders.jira([ticket(key).id])
      return `Moved ${key} to ${status}`
    },

    async flag({ key, blocked }) {
      await jira.setBlocked(key, blocked)
      const item = ticket(key)
      if (item) item.blocked = blocked
      push()
      loaders.jira(item ? [item.id] : [])
      return blocked ? `Flagged ${key} as blocked` : `Removed the blocked flag from ${key}`
    },

    timerStart({ key }) {
      timer.start(key)
      push()
    },

    timerStop() {
      timer.stop()
      push()
    },

    timerDiscard({ key }) {
      timer.clear(key)
      push()
      return `Discarded the unlogged time on ${key}`
    },

    async logDelete({ key, id }) {
      checkEntry(id)
      await jira.deleteLog(key, id)
      timeChanged()
      return `Deleted a time entry on ${key}`
    },

    async logUpdate({ key, id, seconds }) {
      checkDuration(seconds)
      checkEntry(id)
      await jira.updateLog(key, id, seconds)
      timeChanged()
      return `Changed the time on ${key}`
    },

    async log({ key, seconds, date }) {
      checkDuration(seconds)
      if (date) {
        const parsed = new Date(`${date}T12:00:00`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())) throw new Error('Pick a valid day')
        if (date > new Date().toLocaleDateString('sv')) throw new Error('Pick today or an earlier day')
      }
      await jira.log(key, seconds, date)
      // A manual entry leaves the timer's unlogged time alone
      if (!date) timer.clear(key)
      push()
      timeChanged()
      const h = Math.floor(seconds / 3600)
      const m = Math.round((seconds % 3600) / 60)
      return `Logged ${h ? `${h}h` : ''}${String(m).padStart(h ? 2 : 1, '0')}${h ? '' : 'm'} on ${key}`
    }
  }

  return actions
}
