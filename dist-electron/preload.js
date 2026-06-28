import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	onRamGuardStatus: (callback) => ipcRenderer.on("ram-guard-status", (_event, value) => callback(value)),
	onProactiveMessage: (callback) => ipcRenderer.on("proactive-message", (_event, value) => callback(value)),
	sendToOllama: (prompt) => ipcRenderer.invoke("send-to-ollama", prompt),
	quitApp: () => ipcRenderer.send("quit-app")
});
//#endregion
export {};
