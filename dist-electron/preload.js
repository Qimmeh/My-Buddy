import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	onRamGuardStatus: (e) => t.on("ram-guard-status", (t, n) => e(n)),
	onProactiveMessage: (e) => t.on("proactive-message", (t, n) => e(n)),
	onAiStateChange: (e) => t.on("ai-state-change", (t, n) => e(n)),
	sendToOllama: (e) => t.invoke("send-to-ollama", e),
	addManualMemory: (e) => t.send("add-manual-memory", e),
	getMemoryStore: () => t.invoke("get-memory-store"),
	savePlaylistMemory: (e, n) => t.invoke("save-playlist-memory", e, n),
	clearSongCount: (e) => t.invoke("clear-song-count", e),
	saveSpotifyConfig: (e, n) => t.send("save-spotify-config", e, n),
	getSpotifyConfig: () => t.invoke("get-spotify-config"),
	authenticateSpotify: () => t.send("authenticate-spotify"),
	resizeWindow: (e) => t.send("resize-window", e),
	dragWindow: (e, n) => t.send("drag-window", e, n),
	endDrag: (e, n, r) => t.send("end-drag", e, n, r),
	setIgnoreMouseEvents: (e, n) => t.send("set-ignore-mouse-events", e, n),
	quitApp: () => t.send("quit-app")
});
//#endregion
export {};
