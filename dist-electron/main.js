import { BrowserWindow, Menu, Tray, app, globalShortcut, ipcMain, nativeImage, screen } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as http from "node:http";
//#region electron/ramGuard.ts
var execAsync$1 = promisify(exec);
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
			const { stdout } = await execAsync$1("tasklist");
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
//#region electron/spotifyService.ts
var REDIRECT_URI = "http://127.0.0.1:8888/callback";
var TOKEN_FILE = join(app.getPath("userData"), "spotify_tokens.json");
var CONFIG_FILE = join(app.getPath("userData"), "spotify_config.json");
var clientId = "";
var clientSecret = "";
var accessToken = "";
var refreshToken = "";
var tokenExpirationTime = 0;
function loadSpotifyConfig() {
	if (fs.existsSync(CONFIG_FILE)) try {
		const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
		clientId = data.clientId || "";
		clientSecret = data.clientSecret || "";
	} catch (e) {
		console.error("Failed to load Spotify config", e);
	}
	return {
		clientId,
		clientSecret
	};
}
function saveSpotifyConfig(id, secret) {
	clientId = id;
	clientSecret = secret;
	fs.writeFileSync(CONFIG_FILE, JSON.stringify({
		clientId,
		clientSecret
	}));
}
function loadTokens() {
	if (fs.existsSync(TOKEN_FILE)) try {
		const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
		accessToken = data.access_token;
		refreshToken = data.refresh_token;
		tokenExpirationTime = data.expiration_time;
	} catch (e) {
		console.error("Failed to load Spotify tokens", e);
	}
}
function saveTokens(data) {
	accessToken = data.access_token;
	if (data.refresh_token) refreshToken = data.refresh_token;
	tokenExpirationTime = Date.now() + (data.expires_in - 60) * 1e3;
	fs.writeFileSync(TOKEN_FILE, JSON.stringify({
		access_token: accessToken,
		refresh_token: refreshToken,
		expiration_time: tokenExpirationTime
	}));
}
async function getValidToken() {
	if (!clientId || !clientSecret) return null;
	if (!accessToken || !refreshToken) return null;
	if (Date.now() > tokenExpirationTime) {
		const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
		try {
			const res = await fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${authHeader}`
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken
				})
			});
			if (res.ok) saveTokens(await res.json());
			else return null;
		} catch (e) {
			console.error("Token refresh failed", e);
			return null;
		}
	}
	return accessToken;
}
function authenticateSpotify(win) {
	return new Promise((resolve, reject) => {
		if (!clientId || !clientSecret) {
			reject("No Spotify credentials configured");
			return;
		}
		const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent("user-read-playback-state user-modify-playback-state")}`;
		const server = http.createServer(async (req, res) => {
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			if (url.pathname === "/callback") {
				const code = url.searchParams.get("code");
				if (code) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<h1>Spotify authenticated successfully!</h1><p>You can close this window now.</p><script>window.close()<\/script>");
					server.close();
					const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
					try {
						const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded",
								"Authorization": `Basic ${authHeader}`
							},
							body: new URLSearchParams({
								grant_type: "authorization_code",
								code,
								redirect_uri: REDIRECT_URI
							})
						});
						if (tokenRes.ok) {
							saveTokens(await tokenRes.json());
							resolve();
						} else reject("Failed to exchange code");
					} catch (e) {
						reject(e);
					}
				} else {
					res.writeHead(400, { "Content-Type": "text/plain" });
					res.end("Failed to authenticate");
					server.close();
					reject("No code in callback");
				}
			}
		});
		server.listen(8888, () => {
			console.log("Listening for Spotify callback on port 8888");
			exec(`start "" "${authUrl}"`);
		});
	});
}
async function playSpotifyQuery(query, win) {
	let token = await getValidToken();
	if (!token) try {
		await authenticateSpotify(win);
		token = await getValidToken();
	} catch (e) {
		console.error("Failed to auth Spotify during play", e);
		return;
	}
	if (!token) return;
	try {
		const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=1`, { headers: { "Authorization": `Bearer ${token}` } });
		if (searchRes.ok) {
			const data = await searchRes.json();
			let uriToPlay = null;
			if (data.playlists && data.playlists.items.length > 0 && query.toLowerCase().includes("playlist")) uriToPlay = data.playlists.items[0].uri;
			else if (data.tracks && data.tracks.items.length > 0) uriToPlay = data.tracks.items[0].uri;
			if (uriToPlay) {
				let playRes = await fetch("https://api.spotify.com/v1/me/player/play", {
					method: "PUT",
					headers: {
						"Authorization": `Bearer ${token}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						context_uri: uriToPlay.includes("playlist") ? uriToPlay : void 0,
						uris: uriToPlay.includes("track") ? [uriToPlay] : void 0
					})
				});
				if (playRes.status === 404) {
					const devicesRes = await fetch("https://api.spotify.com/v1/me/player/devices", { headers: { "Authorization": `Bearer ${token}` } });
					if (devicesRes.ok) {
						const devicesData = await devicesRes.json();
						if (devicesData.devices && devicesData.devices.length > 0) {
							const targetDevice = devicesData.devices[0].id;
							playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${targetDevice}`, {
								method: "PUT",
								headers: {
									"Authorization": `Bearer ${token}`,
									"Content-Type": "application/json"
								},
								body: JSON.stringify({
									context_uri: uriToPlay.includes("playlist") ? uriToPlay : void 0,
									uris: uriToPlay.includes("track") ? [uriToPlay] : void 0
								})
							});
						}
					}
				}
				if (!playRes.ok) {
					const errText = await playRes.text();
					console.error(`Spotify Play failed: ${playRes.status} ${errText}`);
					exec(`powershell -Command "${`
            $wshell = New-Object -ComObject wscript.shell
            Start-Process "${uriToPlay}"
            Start-Sleep -Seconds 2
            $wshell.AppActivate("Spotify")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("{ENTER}")
          `.replace(/\n/g, ";")}"`);
				}
			} else exec(`start "" "spotify:search:${encodeURIComponent(query)}"`);
		}
	} catch (e) {
		console.error("Spotify search/play error", e);
	}
}
var lastPlayingTrackId = "";
function startSpotifyPoller(win, triggerComment) {
	loadTokens();
	setInterval(async () => {
		const token = await getValidToken();
		if (!token) return;
		try {
			const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { "Authorization": `Bearer ${token}` } });
			if (res.status === 200) {
				const data = await res.json();
				if (data && data.item && data.is_playing) {
					const trackId = data.item.id;
					const trackName = data.item.name;
					const artistName = data.item.artists[0]?.name || "Unknown Artist";
					if (trackId && trackId !== lastPlayingTrackId) {
						lastPlayingTrackId = trackId;
						if (lastPlayingTrackId !== "") {
							if (Math.random() < .3) triggerComment(`You are Zi Feng's Desktop Companion. He is now listening to the song "${trackName}" by "${artistName}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`);
						}
					}
				}
			}
		} catch (e) {}
	}, 1e4);
}
//#endregion
//#region electron/activeWindow.ts
var execAsync = promisify(exec);
var psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  }
"@
$hwnd = [Win32]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $title, 256) > $null
$title.ToString()
`;
async function getActiveWindowTitle() {
	try {
		const tempPath = join(app.getPath("temp"), "active_win.ps1");
		fs.writeFileSync(tempPath, psScript);
		const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPath}"`);
		try {
			fs.unlinkSync(tempPath);
		} catch (e) {}
		return stdout.trim();
	} catch (error) {
		console.error("Failed to get active window title:", error);
		return "";
	}
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
IMPORTANT: Make the query extremely accurate for Spotify's search engine. If it's a playlist, INCLUDE the word 'playlist' (e.g. [TOOL:SPOTIFY:qimchi playlist]). If it's a specific song by an artist, just put the song name and artist name without the word 'by' (e.g. [TOOL:SPOTIFY:double take dhruv]).
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
var lastActiveWindow = "";
function startAiService(win) {
	loadMemory();
	const triggerSpontaneousComment = async (systemPrompt) => {
		try {
			const res = await fetch(OLLAMA_API, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: MODEL_NAME,
					messages: [{
						role: "system",
						content: systemPrompt
					}],
					stream: false
				})
			});
			if (res.ok) {
				const data = await res.json();
				win.webContents.send("proactive-message", data.message.content);
			}
		} catch (e) {
			console.error("Failed spontaneous reaction", e);
		}
	};
	setInterval(async () => {
		const activeWindow = await getActiveWindowTitle();
		if (activeWindow && activeWindow !== lastActiveWindow && !activeWindow.includes("My-Buddy") && !activeWindow.includes("Taskbar")) {
			lastActiveWindow = activeWindow;
			memoryBox = memoryBox.filter((m) => !m.startsWith("User is currently looking at:"));
			memoryBox.push(`User is currently looking at: ${activeWindow}`);
			if (Math.random() < .3) triggerSpontaneousComment(`You are Zi Feng's Desktop Companion. He just opened an app called "${activeWindow}". Give a very short, 1-sentence spontaneous reaction or comment about it.`);
		}
	}, 15e3);
	startSpotifyPoller(win, triggerSpontaneousComment);
	ipcMain.handle("send-to-ollama", async (_event, prompt) => {
		memory.push({
			role: "user",
			content: prompt
		});
		const response = await generateOllamaChat();
		const spotifyMatch = response.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i);
		const rememberMatch = response.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i);
		let finalResponse = response;
		if (spotifyMatch) {
			const query = spotifyMatch[1].trim();
			finalResponse = finalResponse.replace(spotifyMatch[0], "").trim();
			playSpotifyQuery(query, win);
			memory.push({
				role: "system",
				content: `System action executed: Searching and playing Spotify for ${query}`
			});
		}
		if (rememberMatch) {
			const fact = rememberMatch[1].trim();
			finalResponse = finalResponse.replace(rememberMatch[0], "").trim();
			memoryBox.push(fact);
			saveMemory();
			memory.push({
				role: "system",
				content: `System action executed: Saved "${fact}" to long term memory.`
			});
		}
		memory.push({
			role: "assistant",
			content: finalResponse
		});
		saveMemory();
		return finalResponse;
	});
	ipcMain.on("add-manual-memory", (_event, manualMemory) => {
		if (manualMemory.trim() !== "") {
			memoryBox.push(manualMemory.trim());
			saveMemory();
		}
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
//#endregion
//#region electron/main.ts
loadSpotifyConfig();
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
	const x = Math.round(display.bounds.x + 20);
	const y = Math.round(display.bounds.y + display.bounds.height - winBounds.height);
	win.setPosition(x, y, false);
	win.setAlwaysOnTop(true, "screen-saver");
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
ipcMain.on("save-spotify-config", (event, id, secret) => {
	saveSpotifyConfig(id, secret);
});
ipcMain.handle("get-spotify-config", async () => {
	return loadSpotifyConfig();
});
ipcMain.on("authenticate-spotify", (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win) authenticateSpotify(win).catch(console.error);
});
ipcMain.on("set-ignore-mouse-events", (event, ignore) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win) if (ignore) win.setIgnoreMouseEvents(true, { forward: true });
	else win.setIgnoreMouseEvents(false);
});
//#endregion
export {};
