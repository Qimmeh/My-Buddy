import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => 
    ipcRenderer.on('ram-guard-status', (_event, value) => callback(value)),
  onProactiveMessage: (callback: (message: string) => void) =>
    ipcRenderer.on('proactive-message', (_event, value) => callback(value)),
  onAiStateChange: (callback: (state: string) => void) =>
    ipcRenderer.on('ai-state-change', (_event, value) => callback(value)),
  sendToOllama: (prompt: string) => ipcRenderer.invoke('send-to-ollama', prompt),
  addManualMemory: (memory: string) => ipcRenderer.send('add-manual-memory', memory),
  saveSpotifyConfig: (id: string, secret: string) => ipcRenderer.send('save-spotify-config', id, secret),
  getSpotifyConfig: () => ipcRenderer.invoke('get-spotify-config'),
  authenticateSpotify: () => ipcRenderer.send('authenticate-spotify'),
  resizeWindow: (mode: 'avatar' | 'full') => ipcRenderer.send('resize-window', mode),
  dragWindow: (dx: number, dy: number) => ipcRenderer.send('drag-window', dx, dy),
  endDrag: (vx: number, vy: number) => ipcRenderer.send('end-drag', vx, vy),
  quitApp: () => ipcRenderer.send('quit-app'),
})
