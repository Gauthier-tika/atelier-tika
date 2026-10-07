const { app, BrowserWindow, ipcMain, clipboard, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const launch = require('./launch')
const wm = require('./wm')
const { Terminals } = require('./terminals')
const { themeNamed } = require('./themes')

app.setName('atelier')
const shotPath = process.env.ATELIER_SHOT
const hotReload = !shotPath && process.env.ATELIER_HOT !== '0'

let win = null
let quitting = false

const send = (channel, ...args) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}
const terminals = new Terminals(send)
const host = { terminals, send, window: () => win, hot: {}, shotPath }
let serverModule = require('./server')
let server = serverModule.createServer(host)

const reloadable = file => file.startsWith(__dirname + path.sep) && file !== __filename

function swapModules(modules) {
  for (const file of Object.keys(require.cache)) if (reloadable(file)) delete require.cache[file]
  Object.assign(require.cache, modules)
}

function hotFailed(error) {
  console.error(error)
  const where = error.stack?.match(/(\/[^\s:()]+\.js):(\d+)/)
  const place = where ? ` (${path.relative(path.dirname(__dirname), where[1])}:${where[2]})` : ''
  send('hot', 'error', `Reload failed, Atelier keeps its previous code: ${error.message.split('\n')[0]}${place}`)
}

function reloadServer() {
  const previous = Object.fromEntries(Object.entries(require.cache).filter(([file]) => reloadable(file)))
  swapModules({})
  let next
  try {
    next = require('./server')
  } catch (error) {
    swapModules(previous)
    return hotFailed(error)
  }
  server.stop()
  try {
    server = next.createServer(host)
    serverModule = next
  } catch (error) {
    swapModules(previous)
    server = serverModule.createServer(host)
    hotFailed(error)
  }
  server.start({ first: false })
}

function applyChanges(files) {
  const renderer = files.some(file => file.startsWith('renderer/') ? !file.endsWith('.css') : ['preload.js', 'themes.js'].includes(file))
  const serverSide = files.some(file => !file.startsWith('renderer/') && !['main.js', 'preload.js'].includes(file))
  if (files.includes('main.js')) send('hot', 'error', 'src/main.js changed: restart Atelier to apply it')
  if (serverSide) reloadServer()
  if (renderer) loadPage()
  else if (files.some(file => file.endsWith('.css'))) send('hot', 'css')
}

function watchSources() {
  let changed = new Set()
  let timer = null
  fs.watch(__dirname, { recursive: true }, (_event, name) => {
    if (!/\.(js|css|html)$/.test(name || '')) return
    changed.add(name)
    clearTimeout(timer)
    timer = setTimeout(() => {
      const files = [...changed]
      changed = new Set()
      applyChanges(files)
    }, 150)
  })
}

ipcMain.handle('action', (_event, name, payload) => server.action(name, payload))
ipcMain.on('ready', () => server.push())
ipcMain.on('term-input', (_event, id, input) => terminals.write(id, input))
ipcMain.on('term-resize', (_event, id, cols, rows) => terminals.resize(id, cols, rows))
ipcMain.on('term-size', (_event, cols, rows) => terminals.setSize(cols, rows))
ipcMain.handle('term-replay', (_event, id) => {
  terminals.flush()
  return terminals.replay(id)
})
ipcMain.on('view', (_event, view, id) => server.view(view, id))
ipcMain.on('quit', () => {
  quitting = true
  terminals.killAll()
  win?.close()
})
ipcMain.handle('clipboard-read', () => clipboard.readText())
ipcMain.handle('clipboard-write', (_event, text) => clipboard.writeText(String(text)))

function loadPage() {
  const theme = server.config.theme
  win?.loadFile(path.join(__dirname, 'renderer/index.html'), { query: theme ? { theme } : {} })
}

function createWindow() {
  win = new BrowserWindow({
    width: Number(process.env.ATELIER_WIDTH) || 1500,
    height: Number(process.env.ATELIER_HEIGHT) || 960,
    minWidth: 520,
    minHeight: 420,
    show: !shotPath,
    frame: !wm.desktop,
    backgroundColor: themeNamed(server.config.theme).terminal.background,
    title: 'Atelier',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      offscreen: Boolean(shotPath)
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    launch.openUrl(url).catch(() => {})
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', event => event.preventDefault())
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && !input.alt && input.code === 'KeyR') {
      event.preventDefault()
      reloadServer()
      loadPage()
    }
  })
  win.on('close', event => {
    if (quitting || win.webContents.isCrashed()) return terminals.killAll()
    const running = terminals.running()
    if (!running.length) return
    event.preventDefault()
    send('confirm-quit', running.length)
  })
  loadPage()
  win.on('focus', () => server.focused())
}

if (!shotPath && !app.requestSingleInstanceLock()) app.exit(0)

app.on('second-instance', (_event, argv) => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  server.openFromArgs(argv)
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  server.start({ first: true })
  if (shotPath) win.webContents.once('did-finish-load', () => server.screenshot())
  else if (hotReload) watchSources()
})

app.on('window-all-closed', () => app.quit())
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault())
})
