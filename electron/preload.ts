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
  getMemoryStore: () => ipcRenderer.invoke('get-memory-store'),
  savePlaylistMemory: (name: string, uri: string) => ipcRenderer.invoke('save-playlist-memory', name, uri),
  clearSongCount: (uri: string) => ipcRenderer.invoke('clear-song-count', uri),
  saveSpotifyConfig: (id: string, secret: string) => ipcRenderer.send('save-spotify-config', id, secret),
  getSpotifyConfig: () => ipcRenderer.invoke('get-spotify-config'),
  authenticateSpotify: () => ipcRenderer.send('authenticate-spotify'),
  resizeWindow: (mode: 'avatar' | 'full') => ipcRenderer.send('resize-window', mode),
  dragWindow: (dx: number, dy: number) => ipcRenderer.send('drag-window', dx, dy),
  endDrag: (vx: number, vy: number, wasDragged?: boolean) => ipcRenderer.send('end-drag', vx, vy, wasDragged),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  quitApp: () => ipcRenderer.send('quit-app'),
})
