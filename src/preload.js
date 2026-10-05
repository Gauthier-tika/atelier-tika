const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('atelier', {
  action: (name, payload) => ipcRenderer.invoke('action', name, payload),
  onState: callback => ipcRenderer.on('state', (_event, state) => callback(state)),
  onOpenView: callback => ipcRenderer.on('open-view', (_event, id) => callback(id)),
  ready: () => ipcRenderer.send('ready'),
  view: (name, id) => ipcRenderer.send('view', name, id),
  menu: items => ipcRenderer.send('menu', items),
  onMenuPick: callback => ipcRenderer.on('menu-pick', (_event, id) => callback(id)),
  term: {
    input: (id, data) => ipcRenderer.send('term-input', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('term-resize', id, cols, rows),
    size: (cols, rows) => ipcRenderer.send('term-size', cols, rows),
    replay: id => ipcRenderer.invoke('term-replay', id),
    onData: callback => ipcRenderer.on('term-data', (_event, id, data) => callback(id, data)),
    onExit: callback => ipcRenderer.on('term-exit', (_event, id, code) => callback(id, code))
  },
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard-read'),
    write: text => ipcRenderer.invoke('clipboard-write', text)
  }
})
