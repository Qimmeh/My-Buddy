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
	quitApp: () => t.send("quit-app"),
	getAvatarConfig: () => t.invoke("get-avatar-config"),
	selectAvatarImage: (e) => t.invoke("select-avatar-image", e),
	resetAvatarImage: (e) => t.invoke("reset-avatar-image", e),
	saveGeneratedAvatarSet: (e) => t.invoke("save-generated-avatar-set", e),
	onAvatarConfigUpdated: (e) => t.on("avatar-config-updated", (t, n) => e(n)),
	sendMousePosition: (e, n) => t.send("mouse-position", e, n),
	navigateToPoint: (e, n) => t.send("navigate-to-point", e, n),
	onMicroAction: (e) => t.on("micro-action", (t, n) => e(n)),
	onMousePosition: (e) => t.on("mouse-position", (t, n, r) => e(n, r)),
	createBundle: (e, n, r) => t.invoke("create-bundle", e, n, r),
	installBundle: (e) => t.invoke("install-bundle", e),
	listBundles: () => t.invoke("list-bundles"),
	getUserName: () => t.invoke("get-user-name"),
	setUserName: (e) => t.invoke("set-user-name", e),
	onSetUserNamePrompt: (e) => t.on("set-user-name-prompt", () => e()),
	updateTrayIcon: (e) => t.send("update-tray-icon", e)
});
//#endregion
export {};
