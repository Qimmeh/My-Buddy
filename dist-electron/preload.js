import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	onRamGuardStatus: (callback) => ipcRenderer.on("ram-guard-status", (_event, value) => callback(value)),
	onProactiveMessage: (callback) => ipcRenderer.on("proactive-message", (_event, value) => callback(value)),
	onAiStateChange: (callback) => ipcRenderer.on("ai-state-change", (_event, value) => callback(value)),
	sendToOllama: (prompt) => ipcRenderer.invoke("send-to-ollama", prompt),
	addManualMemory: (memory) => ipcRenderer.send("add-manual-memory", memory),
	getMemoryStore: () => ipcRenderer.invoke("get-memory-store"),
	savePlaylistMemory: (name, uri) => ipcRenderer.invoke("save-playlist-memory", name, uri),
	clearSongCount: (uri) => ipcRenderer.invoke("clear-song-count", uri),
	saveSpotifyConfig: (id, secret) => ipcRenderer.send("save-spotify-config", id, secret),
	getSpotifyConfig: () => ipcRenderer.invoke("get-spotify-config"),
	authenticateSpotify: () => ipcRenderer.send("authenticate-spotify"),
	resizeWindow: (mode) => ipcRenderer.send("resize-window", mode),
	dragWindow: (dx, dy) => ipcRenderer.send("drag-window", dx, dy),
	endDrag: (vx, vy, wasDragged) => ipcRenderer.send("end-drag", vx, vy, wasDragged),
	setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send("set-ignore-mouse-events", ignore, options),
	quitApp: () => ipcRenderer.send("quit-app"),
	getAvatarConfig: () => ipcRenderer.invoke("get-avatar-config"),
	selectAvatarImage: (state) => ipcRenderer.invoke("select-avatar-image", state),
	resetAvatarImage: (state) => ipcRenderer.invoke("reset-avatar-image", state),
	saveGeneratedAvatarSet: (images) => ipcRenderer.invoke("save-generated-avatar-set", images),
	onAvatarConfigUpdated: (callback) => ipcRenderer.on("avatar-config-updated", (_event, value) => callback(value))
});
//#endregion
export {};
