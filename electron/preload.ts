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
  
  // Settings
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  
  // Character config
  openCharacterEditor: () => ipcRenderer.send('open-character-editor'),
  getCharacterConfig: () => ipcRenderer.invoke('get-character-config'),
  saveCharacterConfig: (config: any) => ipcRenderer.invoke('save-character-config', config),
  onCharacterConfigUpdated: (callback: (config: any) => void) =>
    ipcRenderer.on('character-config-updated', (_event, value) => callback(value)),

  // Avatar config
  getAvatarConfig: () => ipcRenderer.invoke('get-avatar-config'),
  selectAvatarImage: (state: string) => ipcRenderer.invoke('select-avatar-image', state),
  resetAvatarImage: (state: string) => ipcRenderer.invoke('reset-avatar-image', state),
  saveGeneratedAvatarSet: (images: Record<string, string>) => ipcRenderer.invoke('save-generated-avatar-set', images),
  onAvatarConfigUpdated: (callback: (config: Record<string, string>) => void) =>
    ipcRenderer.on('avatar-config-updated', (_event, value) => callback(value)),
  sendMousePosition: (x: number, y: number) => ipcRenderer.send('mouse-position', x, y),
  navigateToPoint: (x: number, y: number) => ipcRenderer.send('navigate-to-point', x, y),
  onMicroAction: (callback: (action: string) => void) =>
    ipcRenderer.on('micro-action', (_event, value) => callback(value)),
  onMousePosition: (callback: (x: number, y: number) => void) =>
    ipcRenderer.on('mouse-position', (_event, x, y) => callback(x, y)),

  // Marketplace
  createBundle: (name: string, author: string, description: string) => ipcRenderer.invoke('create-bundle', name, author, description),
  installBundle: (bundleId: string) => ipcRenderer.invoke('install-bundle', bundleId),
  listBundles: () => ipcRenderer.invoke('list-bundles'),
  deleteBundle: (bundleId: string) => ipcRenderer.invoke('delete-bundle', bundleId),

  // User name
  getUserName: () => ipcRenderer.invoke('get-user-name'),
  setUserName: (name: string) => ipcRenderer.invoke('set-user-name', name),
  onSetUserNamePrompt: (callback: () => void) =>
    ipcRenderer.on('set-user-name-prompt', () => callback()),

  // Tray icon
  updateTrayIcon: (imagePath: string) => ipcRenderer.send('update-tray-icon', imagePath),
})
