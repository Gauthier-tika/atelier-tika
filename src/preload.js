const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('atelier', {
  action: (name, payload) => ipcRenderer.invoke('action', name, payload),
  onState: callback => ipcRenderer.on('state', (_event, state) => callback(state)),
  onOpenView: callback => ipcRenderer.on('open-view', (_event, id) => callback(id)),
  onQualifOutput: callback => ipcRenderer.on('qualif-output', (_event, number, chunk) => callback(number, chunk)),
  ready: () => ipcRenderer.send('ready'),
  view: (name, id) => ipcRenderer.send('view', name, id),
  onConfirmQuit: callback => ipcRenderer.on('confirm-quit', (_event, running) => callback(running)),
  quit: () => ipcRenderer.send('quit'),
  onHot: callback => ipcRenderer.on('hot', (_event, kind, message) => callback(kind, message)),
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
