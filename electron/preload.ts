import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => 
    ipcRenderer.on('ram-guard-status', (_event, value) => callback(value)),
  onProactiveMessage: (callback: (message: string) => void) =>
    ipcRenderer.on('proactive-message', (_event, value) => callback(value)),
  sendToOllama: (prompt: string) => ipcRenderer.invoke('send-to-ollama', prompt),
  quitApp: () => ipcRenderer.send('quit-app'),
})
