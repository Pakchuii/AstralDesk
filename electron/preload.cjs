const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  moveWindowBy: (deltaX, deltaY) => ipcRenderer.send('window-move-by', { deltaX, deltaY }),
  resizeWindowBy: (deltaW, deltaH) => ipcRenderer.send('window-resize-by', { deltaW, deltaH }),
  setWindowSize: (width, height) => ipcRenderer.send('window-set-size', { width, height }),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  setWindowMode: (mode) => ipcRenderer.send('set-window-mode', mode),
  onModeChange: (callback) => {
    ipcRenderer.on('mode-changed', (_event, mode) => callback(mode));
  },
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),
  openExternal: (url) => shell.openExternal(url),
  onAstrBotPushMessage: (callback) => {
    ipcRenderer.on('astrbot:new-push-message', (_event, data) => callback(data));
  },
  fetchMissedMessages: (limit) => ipcRenderer.invoke('astrbot:fetch-missed-messages', limit),
  getMouseThrough: () => ipcRenderer.invoke('get-mouse-through'),
  setMouseThrough: (enabled) => ipcRenderer.invoke('set-mouse-through', enabled),
  onMouseThroughChange: (callback) => {
    ipcRenderer.on('mouse-through-changed', (_event, val) => callback(val));
  },
});
