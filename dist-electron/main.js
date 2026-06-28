import { BrowserWindow, Menu, Tray, app, globalShortcut, ipcMain, nativeImage, screen } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
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
//#region electron/aiService.ts
var OLLAMA_API = "http://localhost:11434/api/chat";
var MODEL_NAME = "llama3";
var HISTORY_FILE = join(app.getPath("userData"), "history.json");
var MEMORY_BOX_FILE = join(app.getPath("userData"), "memory_box.json");
var MAX_MEMORY = 20;
var memoryBox = [];
var SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.
You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.

Here are the facts you remember about the user:
{MEMORY_BOX}

If the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and end your response EXACTLY with the text: [TOOL:SPOTIFY:query].
If the user tells you to remember something about them or their preferences, you must save it by ending your response EXACTLY with the text: [TOOL:REMEMBER:fact].
For example: [TOOL:REMEMBER:User's favorite color is blue].
Do not include brackets except for the tool call.`;
var memory = [];
function loadMemory() {
	try {
		if (fs.existsSync(HISTORY_FILE)) {
			const data = fs.readFileSync(HISTORY_FILE, "utf-8");
			memory = JSON.parse(data);
		}
		if (fs.existsSync(MEMORY_BOX_FILE)) {
			const data = fs.readFileSync(MEMORY_BOX_FILE, "utf-8");
			memoryBox = JSON.parse(data);
		}
	} catch (e) {
		console.error("Failed to load memory", e);
	}
}
function saveMemory() {
	try {
		if (memory.length > MAX_MEMORY) memory = memory.slice(memory.length - MAX_MEMORY);
		fs.writeFileSync(HISTORY_FILE, JSON.stringify(memory));
		fs.writeFileSync(MEMORY_BOX_FILE, JSON.stringify(memoryBox));
	} catch (e) {
		console.error("Failed to save memory", e);
	}
}
function startAiService(win) {
	loadMemory();
	ipcMain.handle("send-to-ollama", async (_event, prompt) => {
		memory.push({
			role: "user",
			content: prompt
		});
		const response = await generateOllamaChat();
		const spotifyMatch = response.match(/\[TOOL:SPOTIFY:(.*?)\]/);
		const rememberMatch = response.match(/\[TOOL:REMEMBER:(.*?)\]/);
		let finalResponse = response;
		if (spotifyMatch) {
			const query = spotifyMatch[1].trim();
			finalResponse = finalResponse.replace(spotifyMatch[0], "").trim();
			executeSpotifyTool(query);
			memory.push({
				role: "system",
				content: `System action executed: Opened Spotify searching for ${query}`
			});
		}
		if (rememberMatch) {
			const fact = rememberMatch[1].trim();
			finalResponse = finalResponse.replace(rememberMatch[0], "").trim();
			memoryBox.push(fact);
			memory.push({
				role: "system",
				content: `System action executed: Saved fact to memory box: ${fact}`
			});
		}
		memory.push({
			role: "assistant",
			content: finalResponse
		});
		saveMemory();
		return finalResponse;
	});
}
async function generateOllamaChat() {
	try {
		const memoryFacts = memoryBox.length > 0 ? memoryBox.map((m) => "- " + m).join("\\n") : "No facts remembered yet.";
		const messages = [{
			role: "system",
			content: SYSTEM_PROMPT.replace("{MEMORY_BOX}", memoryFacts)
		}, ...memory];
		const res = await fetch(OLLAMA_API, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: MODEL_NAME,
				messages,
				stream: false
			})
		});
		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`HTTP error! status: ${res.status}, body: ${errText}`);
		}
		return (await res.json()).message.content;
	} catch (error) {
		console.error("[Ollama API] Error:", error.message);
		if (error.message.includes("404")) return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it.";
		return "Connection to local AI failed. Is Ollama running?";
	}
}
function executeSpotifyTool(query) {
	console.log(`Executing Spotify tool with query: ${query}`);
	exec(`start spotify:search:${encodeURIComponent(query)}`, (error) => {
		if (error) console.error(`Failed to execute Spotify command: ${error.message}`);
	});
}
//#endregion
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var preload = join(__dirname, "preload.js");
var win = null;
var tray = null;
function createWindow() {
	win = new BrowserWindow({
		width: 300,
		height: 400,
		show: false,
		frame: false,
		transparent: true,
		skipTaskbar: true,
		alwaysOnTop: true,
		resizable: false,
		hasShadow: false,
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
	startAiService(win);
}
function createTray() {
	let iconPath = join(__dirname, "../public/icon.png");
	if (!process.env.VITE_DEV_SERVER_URL) iconPath = join(__dirname, "../dist/icon.png");
	tray = new Tray(nativeImage.createFromPath(iconPath).resize({
		width: 24,
		height: 24
	}));
	tray.setToolTip("Zi Feng Buddy");
	tray.on("click", () => {
		toggleWindow();
	});
	const contextMenu = Menu.buildFromTemplate([{
		label: "Quit",
		click: () => {
			app.exit();
		}
	}]);
	tray.on("right-click", () => {
		tray?.popUpContextMenu(contextMenu);
	});
}
function toggleWindow() {
	if (!win) return;
	if (win.isVisible()) win.hide();
	else {
		positionWindow();
		win.show();
	}
}
function positionWindow() {
	if (!win) return;
	const display = screen.getPrimaryDisplay();
	const winBounds = win.getBounds();
	const x = display.bounds.x + 20;
	const y = display.bounds.y + display.bounds.height - winBounds.height;
	win.setPosition(x, y, false);
	win.setAlwaysOnTop(true, "normal");
}
app.whenReady().then(() => {
	createWindow();
	createTray();
	positionWindow();
	win?.show();
	globalShortcut.register("CommandOrControl+Shift+Space", () => {
		toggleWindow();
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
