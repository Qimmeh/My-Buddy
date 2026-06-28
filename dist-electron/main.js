import { BrowserWindow, app, globalShortcut, ipcMain, powerMonitor } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
//#region electron/ramGuard.ts
var execAsync = promisify(exec);
var TARGET_GAMES = [
	"VALORANT.exe",
	"Minecraft.exe",
	"javaw.exe"
];
var OLLAMA_API$1 = "http://localhost:11434/api/generate";
var MODEL_NAME$1 = "llama3";
var isSleeping = false;
function startRamGuard(win) {
	setInterval(async () => {
		try {
			const { stdout } = await execAsync("tasklist");
			const gameDetected = TARGET_GAMES.some((game) => stdout.toLowerCase().includes(game.toLowerCase()));
			if (gameDetected && !isSleeping) {
				console.log("[RAM Guard] Game detected. Unloading Ollama model...");
				await fetch(OLLAMA_API$1, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						model: MODEL_NAME$1,
						keep_alive: 0
					})
				}).catch((err) => console.error("[RAM Guard] Failed to unload Ollama:", err));
				isSleeping = true;
				win.webContents.send("ram-guard-status", "sleeping");
			} else if (!gameDetected && isSleeping) {
				console.log("[RAM Guard] Game closed. AI is active.");
				isSleeping = false;
				win.webContents.send("ram-guard-status", "active");
			}
		} catch (error) {
			console.error("[RAM Guard] Error checking processes:", error);
		}
	}, 1e4);
}
//#endregion
//#region electron/reactivityEngine.ts
var IDLE_THRESHOLD_SECONDS = 600;
var OLLAMA_API = "http://localhost:11434/api/generate";
var MODEL_NAME = "llama3";
var SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You are a sleek, minimalist AI. You are reactive—if the user has been idle, suggest music or ask about their current coding progress. You know about their 'DuitFlow' project and their schedule. Be helpful, slightly witty, and tech-savvy. You operate in a 'Command Portal' mode.`;
var hasTriggeredIdle = false;
function startReactivityEngine(win) {
	setInterval(() => {
		const idleTime = powerMonitor.getSystemIdleTime();
		if (idleTime >= IDLE_THRESHOLD_SECONDS && !hasTriggeredIdle) {
			hasTriggeredIdle = true;
			triggerProactiveMessage(win);
		} else if (idleTime < IDLE_THRESHOLD_SECONDS && hasTriggeredIdle) hasTriggeredIdle = false;
	}, 1e4);
	ipcMain.handle("send-to-ollama", async (_event, prompt) => {
		return await generateOllamaResponse(prompt);
	});
}
async function triggerProactiveMessage(win) {
	try {
		const response = await generateOllamaResponse(`The user has been idle for a while. Proactively engage them. Keep it short (1-2 sentences).`);
		if (response) win.webContents.send("proactive-message", response);
	} catch (error) {
		console.error("[Reactivity Engine] Failed to get proactive message:", error);
	}
}
async function generateOllamaResponse(prompt) {
	try {
		const res = await fetch(OLLAMA_API, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: MODEL_NAME,
				system: SYSTEM_PROMPT,
				prompt,
				stream: false
			})
		});
		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`HTTP error! status: ${res.status}, body: ${errText}`);
		}
		return (await res.json()).response;
	} catch (error) {
		console.error("[Ollama API] Error:", error.message);
		if (error.message.includes("404")) return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it.";
		return "Connection to local AI failed. Is Ollama running?";
	}
}
//#endregion
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var preload = join(__dirname, "preload.js");
var win = null;
function createWindow() {
	win = new BrowserWindow({
		width: 800,
		height: 600,
		alwaysOnTop: true,
		frame: false,
		transparent: true,
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: true
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
	else win.loadFile(join(__dirname, "../dist/index.html"));
	win.on("close", (e) => {
		e.preventDefault();
		win?.hide();
	});
	startRamGuard(win);
	startReactivityEngine(win);
}
app.whenReady().then(() => {
	createWindow();
	globalShortcut.register("CommandOrControl+Shift+Space", () => {
		if (win) if (win.isVisible() && win.isFocused()) win.hide();
		else {
			win.show();
			win.focus();
		}
	});
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});
ipcMain.on("quit-app", () => {
	app.exit();
});
//#endregion
export {};
