import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setWindowMode: (mode: 'main' | 'mini') => ipcRenderer.send('set-window-mode', mode),
  onModeChange: (callback: (mode: 'main' | 'mini') => void) => {
    ipcRenderer.on('mode-changed', (_event, mode) => callback(mode));
  },
  openExternal: (url: string) => shell.openExternal(url),
  onAstrBotPushMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('astrbot:new-push-message', (_event, data) => callback(data));
  },
  fetchMissedMessages: (limit?: number) => ipcRenderer.invoke('astrbot:fetch-missed-messages', limit),
  getMouseThrough: () => ipcRenderer.invoke('get-mouse-through'),
  setMouseThrough: (enabled: boolean) => ipcRenderer.invoke('set-mouse-through', enabled),
  onMouseThroughChange: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('mouse-through-changed', (_event, val) => callback(val));
  },
});
