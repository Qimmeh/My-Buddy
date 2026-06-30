import { BrowserWindow, Menu, Tray, app, dialog, globalShortcut, ipcMain, nativeImage, screen } from "electron";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { promises } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as http from "node:http";
import { createHash } from "node:crypto";
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
//#region electron/characterConfig.ts
var DEFAULT_CONFIG = {
	characterName: "Raiden Shogun",
	characterTips: "from Genshin Impact",
	personalityPrompt: "You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.",
	themeColor: "#b026ff"
};
function getConfigPath() {
	return join(app.getPath("userData"), "character_config.json");
}
function getCharacterConfig() {
	const configPath = getConfigPath();
	try {
		if (fs.existsSync(configPath)) {
			const data = fs.readFileSync(configPath, "utf-8");
			const parsed = JSON.parse(data);
			return {
				...DEFAULT_CONFIG,
				...parsed
			};
		}
	} catch (err) {
		console.error("Failed to read character config", err);
	}
	return { ...DEFAULT_CONFIG };
}
function saveCharacterConfig(config) {
	const configPath = getConfigPath();
	try {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	} catch (err) {
		console.error("Failed to save character config", err);
	}
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
function authenticateSpotify(_win) {
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
		return null;
	}
	if (!token) return null;
	try {
		const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=1`, { headers: { "Authorization": `Bearer ${token}` } });
		if (searchRes.ok) {
			const data = await searchRes.json();
			let uriToPlay = null;
			let name = "";
			let artist = "";
			if (data.playlists && data.playlists.items.length > 0 && query.toLowerCase().includes("playlist")) {
				uriToPlay = data.playlists.items[0].uri;
				name = data.playlists.items[0].name;
				artist = data.playlists.items[0].owner.display_name;
			} else if (data.tracks && data.tracks.items.length > 0) {
				uriToPlay = data.tracks.items[0].uri;
				name = data.tracks.items[0].name;
				artist = data.tracks.items[0].artists[0].name;
			}
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
				return {
					name,
					artist,
					uri: uriToPlay
				};
			} else exec(`start "" "spotify:search:${encodeURIComponent(query)}"`);
		}
	} catch (e) {
		console.error("Spotify search/play error", e);
	}
	return null;
}
async function playSpotifyUri(uri, win) {
	let token = await getValidToken();
	if (!token) try {
		await authenticateSpotify(win);
		token = await getValidToken();
	} catch (e) {
		console.error("Failed to auth Spotify for URI play", e);
		return null;
	}
	if (!token) return null;
	const isTrack = uri.includes(":track:");
	const isPlaylist = uri.includes(":playlist:");
	try {
		const body = {};
		if (isPlaylist) body.context_uri = uri;
		else if (isTrack) body.uris = [uri];
		else return playSpotifyQuery(uri, win);
		let playRes = await fetch("https://api.spotify.com/v1/me/player/play", {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});
		if (playRes.status === 404) {
			const devicesRes = await fetch("https://api.spotify.com/v1/me/player/devices", { headers: { "Authorization": "Bearer " + token } });
			if (devicesRes.ok) {
				const devicesData = await devicesRes.json();
				if (devicesData.devices?.length > 0) {
					const deviceId = devicesData.devices[0].id;
					playRes = await fetch("https://api.spotify.com/v1/me/player/play?device_id=" + deviceId, {
						method: "PUT",
						headers: {
							"Authorization": "Bearer " + token,
							"Content-Type": "application/json"
						},
						body: JSON.stringify(body)
					});
				}
			}
		}
		if (!playRes.ok) exec("powershell -Command \"" + ("$wshell = New-Object -ComObject wscript.shell; Start-Process \"" + uri + "\"; Start-Sleep -Seconds 2; $wshell.AppActivate(\"Spotify\"); Start-Sleep -Milliseconds 500; $wshell.SendKeys(\"{ENTER}\")") + "\"");
		if (isTrack) {
			const trackId = uri.split(":track:")[1];
			const infoRes = await fetch("https://api.spotify.com/v1/tracks/" + trackId, { headers: { "Authorization": "Bearer " + token } });
			if (infoRes.ok) {
				const data = await infoRes.json();
				return {
					name: data.name,
					artist: data.artists[0]?.name || "Unknown",
					uri
				};
			}
		} else if (isPlaylist) {
			const playlistId = uri.split(":playlist:")[1];
			const infoRes = await fetch("https://api.spotify.com/v1/playlists/" + playlistId, { headers: { "Authorization": "Bearer " + token } });
			if (infoRes.ok) {
				const data = await infoRes.json();
				return {
					name: data.name,
					artist: data.owner?.display_name || "Unknown",
					uri
				};
			}
		}
		return {
			name: "Track",
			artist: "Spotify",
			uri
		};
	} catch (e) {
		console.error("playSpotifyUri error", e);
		return null;
	}
}
var lastPlayingTrackId = "";
var isPlaybackActive = false;
function isSpotifyPlaying() {
	return isPlaybackActive;
}
function startSpotifyPoller(_win, triggerComment, onSongDetected) {
	loadTokens();
	console.log("[Spotify Poller] Started - polling every 10s");
	setInterval(async () => {
		console.log("[Spotify Poller] Tick - checking current track...");
		const token = await getValidToken();
		if (!token) {
			isPlaybackActive = false;
			return;
		}
		try {
			const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { "Authorization": `Bearer ${token}` } });
			if (res.status === 200) {
				const data = await res.json();
				if (data && data.item && data.is_playing) {
					isPlaybackActive = true;
					const trackId = data.item.id;
					const trackName = data.item.name;
					const artistName = data.item.artists[0]?.name || "Unknown Artist";
					if (trackId && trackId !== lastPlayingTrackId) {
						console.log("[Spotify Poller] New track detected:", trackName, "by", artistName);
						lastPlayingTrackId = trackId;
						if (lastPlayingTrackId !== "") {
							triggerComment(`You are Zi Feng's Desktop Companion. He is now listening to the song "${trackName}" by "${artistName}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`);
							if (onSongDetected) onSongDetected(trackName, artistName, trackId);
						}
					}
				} else isPlaybackActive = false;
			} else if (res.status === 204) isPlaybackActive = false;
			else if (res.status === 401 || res.status === 403) isPlaybackActive = false;
		} catch (e) {
			console.error("[Spotify Poller] Error:", e);
		}
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
dirname(fileURLToPath(import.meta.url));
var HISTORY_FILE = join(app.getPath("userData"), "chat_history.json");
var MEMORY_STORE_FILE = join(app.getPath("userData"), "memory_store.json");
var MEMORY_BOX_FILE = join(app.getPath("userData"), "memory_box.json");
var OLLAMA_API = "http://127.0.0.1:11434/api/chat";
var MODEL_NAME = "llama3";
var MAX_MEMORY = 50;
var memoryStore = {
	songPlays: {},
	playlists: [],
	facts: []
};
function loadMemoryStore() {
	if (fs.existsSync(MEMORY_STORE_FILE)) try {
		const raw = fs.readFileSync(MEMORY_STORE_FILE, "utf-8");
		return JSON.parse(raw);
	} catch (e) {
		console.error("Failed to parse memory_store.json, migrating...", e);
	}
	if (fs.existsSync(MEMORY_BOX_FILE)) try {
		const raw = fs.readFileSync(MEMORY_BOX_FILE, "utf-8");
		const oldBox = JSON.parse(raw);
		const store = {
			songPlays: {},
			playlists: [],
			facts: []
		};
		for (const entry of oldBox) {
			const songMatch = entry.match(/User played music: "(.*)" by (.*) \(Spotify URI: (spotify:track:\w+)\)/);
			if (songMatch) {
				const [, name, artist, uri] = songMatch;
				if (!store.songPlays[uri]) store.songPlays[uri] = {
					name,
					artist,
					uri,
					count: 1
				};
				else store.songPlays[uri].count++;
			} else store.facts.push(entry);
		}
		fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(store, null, 2));
		try {
			fs.unlinkSync(MEMORY_BOX_FILE);
		} catch {}
		return store;
	} catch (e) {
		console.error("Failed to migrate memory_box.json", e);
	}
	return {
		songPlays: {},
		playlists: [],
		facts: []
	};
}
function saveMemoryStore() {
	try {
		console.log("[Memory] Saving to:", MEMORY_STORE_FILE);
		fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(memoryStore, null, 2));
	} catch (e) {
		console.error("[Memory] Failed to save:", MEMORY_STORE_FILE, e);
	}
}
function formatMemoryForPrompt() {
	const lines = [];
	const facts = memoryStore.facts.filter((f) => !f.startsWith("User is currently looking at:"));
	const activeWindow = memoryStore.facts.find((f) => f.startsWith("User is currently looking at:"));
	if (facts.length > 0) {
		lines.push("=== FACTS ABOUT THE USER ===");
		for (const f of facts) lines.push("- " + f);
		lines.push("");
	}
	if (activeWindow) {
		lines.push("=== WHAT THE USER IS DOING RIGHT NOW ===");
		lines.push("- " + activeWindow);
		lines.push("");
	}
	const songs = Object.values(memoryStore.songPlays);
	if (songs.length > 0) {
		lines.push("=== SONGS THE USER HAS PLAYED ===");
		const sorted = [...songs].sort((a, b) => b.count - a.count);
		for (const s of sorted) {
			const suffix = s.count > 1 ? "times" : "time";
			lines.push("- \"" + s.name + "\" by " + s.artist + " — played " + s.count + " " + suffix + " (URI: " + s.uri + ")");
		}
		lines.push("");
	}
	if (memoryStore.playlists.length > 0) {
		lines.push("=== SAVED PLAYLISTS ===");
		for (const p of memoryStore.playlists) lines.push("- " + p.name + " (URI: " + p.uri + ")");
		lines.push("");
	}
	return lines.join("\n") || "Nothing remembered yet.";
}
function getSystemPrompt() {
	const config = getCharacterConfig();
	let base = `You are the user's Desktop Companion. You are acting as the character ${config.characterName}`;
	if (config.characterTips) base += ` (${config.characterTips})`;
	base += `.\n${config.personalityPrompt}\nYou have memory of past conversations.\n`;
	return base + `
Here is everything you remember about the user:

{MEMORY_BOX}`;
}
var SYSTEM_PROMPT_INSTRUCTIONS = `
=== INSTRUCTIONS FOR MUSIC ===
If the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and then end your response with one of these tool calls:

1. [TOOL:SPOTIFY:query]
   Use this when the user asks for a song, artist, or playlist by name. Make the query accurate for Spotify's search. If it's a playlist, include the word 'playlist'.
   Example: [TOOL:SPOTIFY:double take dhruv]
   Example: [TOOL:SPOTIFY:chill vibes playlist]

2. [TOOL:SPOTIFY_URI:spotify:xxx]
   Use this when the user asks to play something that has a known URI in your memory (either from Songs the User Has Played or Saved Playlists).
   Example: [TOOL:SPOTIFY_URI:spotify:track:12345]
   Example: [TOOL:SPOTIFY_URI:spotify:playlist:abc123]

3. [TOOL:SAVE_PLAYLIST:name|uri_or_url]
   Use this when the user gives you a playlist URI or URL and asks you to remember it. The format is the playlist name, then a pipe |, then the URI or URL.
   Example: [TOOL:SAVE_PLAYLIST:Chill Vibes|spotify:playlist:abc123]
   Example: [TOOL:SAVE_PLAYLIST:Workout Mix|https://open.spotify.com/playlist/xyz789]

=== INSTRUCTIONS FOR REMEMBERING ===
If the user tells you to remember something about them or their preferences, use:
[TOOL:REMEMBER:fact]
Example: [TOOL:REMEMBER:User's favorite color is blue]

Do not include extra brackets except for the tool call. If the user asks what you remember or about their listening habits, check the memory sections above.`;
var memory = [];
function loadMemory() {
	try {
		if (fs.existsSync(HISTORY_FILE)) {
			const data = fs.readFileSync(HISTORY_FILE, "utf-8");
			memory = JSON.parse(data);
		}
		memoryStore = loadMemoryStore();
	} catch (e) {
		console.error("Failed to load memory", e);
	}
}
function saveMemory() {
	try {
		if (memory.length > MAX_MEMORY) memory = memory.slice(memory.length - MAX_MEMORY);
		fs.writeFileSync(HISTORY_FILE, JSON.stringify(memory));
		saveMemoryStore();
	} catch (e) {
		console.error("Failed to save memory", e);
	}
}
var lastActiveWindow = "";
function startAiService(win) {
	loadMemory();
	var req = http.request({
		hostname: "127.0.0.1",
		port: 11434,
		path: "/api/tags",
		method: "GET"
	}, function(res) {
		var data = "";
		res.on("data", function(c) {
			data += c;
		});
		res.on("end", function() {
			try {
				var names = (JSON.parse(data).models || []).map(function(m) {
					return m.name;
				}).join(", ");
				console.log("[Diagnostic] Ollama reachable, models:", names);
			} catch (e) {
				console.error("[Diagnostic] Parse error:", e.message);
			}
		});
	});
	req.on("error", function(e) {
		console.error("[Diagnostic] Ollama unreachable:", e.message);
	});
	req.end();
	const triggerSpontaneousComment = async (systemPrompt) => {
		console.log("[Spontaneous] Calling Ollama with:", systemPrompt.substring(0, 80) + "...");
		try {
			const postData = JSON.stringify({
				model: MODEL_NAME,
				messages: [{
					role: "system",
					content: systemPrompt
				}],
				stream: false
			});
			console.log("[Spontaneous] POST body size:", postData.length);
			const result = await new Promise(function(resolve, reject) {
				var req = http.request({
					hostname: "127.0.0.1",
					port: 11434,
					path: "/api/chat",
					method: "POST",
					headers: { "Content-Type": "application/json" }
				}, function(res) {
					var body = "";
					res.on("data", function(chunk) {
						body += chunk;
					});
					res.on("end", function() {
						resolve(body);
					});
					res.on("error", function(e) {
						reject(e);
					});
				});
				req.on("error", function(e) {
					reject(e);
				});
				var timer = setTimeout(function() {
					console.log("[Spontaneous] Request timed out, destroying");
					req.destroy();
					reject(/* @__PURE__ */ new Error("Timeout"));
				}, 25e3);
				req.on("response", function() {
					console.log("[Spontaneous] Got response headers, clearing timeout");
					clearTimeout(timer);
				});
				req.write(postData);
				req.end();
			});
			console.log("[Spontaneous] Got response, parsing...");
			const parsed = JSON.parse(result);
			if (parsed.message && parsed.message.content) {
				console.log("[Spontaneous] Ollama replied, sending to renderer:", parsed.message.content.substring(0, 60));
				win.webContents.send("proactive-message", parsed.message.content);
			} else console.error("[Spontaneous] Unexpected Ollama response:", result.substring(0, 200));
		} catch (e) {
			console.error("Failed spontaneous reaction", e);
		}
	};
	setInterval(async () => {
		const activeWindow = await getActiveWindowTitle();
		if (activeWindow && activeWindow !== lastActiveWindow && !activeWindow.includes("My-Buddy") && !activeWindow.includes("Taskbar")) {
			lastActiveWindow = activeWindow;
			memoryStore.facts = memoryStore.facts.filter((f) => !f.startsWith("User is currently looking at:"));
			memoryStore.facts.push("User is currently looking at: " + activeWindow);
			saveMemoryStore();
			if (Math.random() < .3) triggerSpontaneousComment(getSystemPrompt() + "\n" + SYSTEM_PROMPT_INSTRUCTIONS + "\nThe user just opened an app called \"" + activeWindow + "\". Give a very short, 1-sentence spontaneous reaction or comment about it.");
		}
	}, 15e3);
	startSpotifyPoller(win, triggerSpontaneousComment, function(name, artist, trackId) {
		console.log("[Memory] Poller detected song:", name, "by", artist);
		incrementSongPlay(name, artist, "spotify:track:" + trackId);
	});
	let lastPlaylistSuggestionTime = 0;
	setInterval(async () => {
		if (isSpotifyPlaying()) return;
		if (Math.random() >= .07) return;
		const now = Date.now();
		if (now - lastPlaylistSuggestionTime < 720 * 1e3) return;
		lastPlaylistSuggestionTime = now;
		const playlists = memoryStore.playlists;
		let ctx = "";
		if (playlists.length > 0) ctx = "Here are his saved playlists:\n" + playlists.map(function(p) {
			return "- " + p.name + " (" + p.uri + ")";
		}).join("\n");
		triggerSpontaneousComment(getSystemPrompt() + "\n" + SYSTEM_PROMPT_INSTRUCTIONS + "\nThe user is not currently listening to music or playing anything on Spotify. Suggest if they would like to play one of their favorite playlists. " + ctx + " Keep it short, 1 sentence, casual and cute. Mention a specific playlist name if you know one.");
	}, 240 * 1e3);
	ipcMain.handle("send-to-ollama", async (_event, prompt) => {
		memory.push({
			role: "user",
			content: prompt
		});
		const response = await generateOllamaChat();
		const spotifyMatch = response.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i);
		const spotifyUriMatch = response.match(/\[?TOOL:SPOTIFY_URI:([^\]\n]+)\]?/i);
		const rememberMatch = response.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i);
		const savePlaylistMatch = response.match(/\[?TOOL:SAVE_PLAYLIST:([^\]\n|]+)\|([^\]\n]+)\]?/i);
		let finalResponse = response;
		if (spotifyUriMatch) {
			const uri = spotifyUriMatch[1].trim();
			finalResponse = finalResponse.replace(spotifyUriMatch[0], "").trim();
			if (!finalResponse) finalResponse = "Playing from memory!";
			playSpotifyUri(uri, win).then((playedMetadata) => {
				if (playedMetadata && playedMetadata.uri.includes(":track:")) incrementSongPlay(playedMetadata.name, playedMetadata.artist, playedMetadata.uri);
			}).catch(console.error);
			memory.push({
				role: "system",
				content: "System action executed: Playing Spotify URI " + uri
			});
		}
		if (spotifyMatch) {
			const query = spotifyMatch[1].trim();
			finalResponse = finalResponse.replace(spotifyMatch[0], "").trim();
			if (!finalResponse) finalResponse = "Playing " + query + " on Spotify!";
			playSpotifyQuery(query, win).then((playedMetadata) => {
				if (playedMetadata) incrementSongPlay(playedMetadata.name, playedMetadata.artist, playedMetadata.uri);
			}).catch(console.error);
			memory.push({
				role: "system",
				content: "System action executed: Searching and playing Spotify for " + query
			});
		}
		if (rememberMatch) {
			const fact = rememberMatch[1].trim();
			finalResponse = finalResponse.replace(rememberMatch[0], "").trim();
			if (!finalResponse) finalResponse = "Got it, I'll remember that!";
			if (!memoryStore.facts.includes(fact)) {
				memoryStore.facts.push(fact);
				saveMemoryStore();
			}
			memory.push({
				role: "system",
				content: "System action executed: Saved \"" + fact + "\" to long term memory."
			});
		}
		if (savePlaylistMatch) {
			const name = savePlaylistMatch[1].trim();
			let uri = savePlaylistMatch[2].trim();
			const urlMatch = uri.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
			if (urlMatch) {
				const type = urlMatch[1];
				const id = urlMatch[2];
				uri = "spotify:" + type + ":" + id;
			}
			finalResponse = finalResponse.replace(savePlaylistMatch[0], "").trim();
			if (!finalResponse) finalResponse = "Saved the playlist \"" + name + "\"!";
			memoryStore.playlists = memoryStore.playlists.filter((p) => p.uri !== uri);
			memoryStore.playlists.push({
				name,
				uri
			});
			saveMemoryStore();
			memory.push({
				role: "system",
				content: "System action executed: Saved playlist \"" + name + "\" (" + uri + ") to memory."
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
			memoryStore.facts.push(manualMemory.trim());
			saveMemoryStore();
		}
	});
	ipcMain.handle("get-memory-store", async () => {
		return JSON.parse(JSON.stringify(memoryStore));
	});
	ipcMain.handle("save-playlist-memory", async (_event, name, uri) => {
		memoryStore.playlists = memoryStore.playlists.filter((p) => p.uri !== uri);
		memoryStore.playlists.push({
			name,
			uri
		});
		saveMemoryStore();
		return true;
	});
	ipcMain.handle("clear-song-count", async (_event, uri) => {
		if (memoryStore.songPlays[uri]) {
			delete memoryStore.songPlays[uri];
			saveMemoryStore();
		}
		return true;
	});
}
function incrementSongPlay(name, artist, uri) {
	console.log("[Memory] incrementSongPlay:", name, "by", artist, "uri:", uri);
	if (memoryStore.songPlays[uri]) {
		memoryStore.songPlays[uri].count++;
		memoryStore.songPlays[uri].name = name;
		memoryStore.songPlays[uri].artist = artist;
	} else memoryStore.songPlays[uri] = {
		name,
		artist,
		uri,
		count: 1
	};
	saveMemoryStore();
}
async function generateOllamaChat() {
	try {
		const memoryFacts = formatMemoryForPrompt();
		const messages = [{
			role: "system",
			content: (getSystemPrompt() + "\n" + SYSTEM_PROMPT_INSTRUCTIONS).replace("{MEMORY_BOX}", memoryFacts)
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
			throw new Error("HTTP error! status: " + res.status + ", body: " + errText);
		}
		return (await res.json()).message.content;
	} catch (error) {
		console.error("[Ollama API] Error:", error.message);
		if (error.message.includes("404")) return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it.";
		return "Connection to local AI failed. Is Ollama running?";
	}
}
//#endregion
//#region electron/avatarService.ts
var USER_DATA_PATH$1 = app.getPath("userData");
var AVATAR_DIR = join(USER_DATA_PATH$1, "avatars");
var CONFIG_PATH = join(USER_DATA_PATH$1, "avatar-config.json");
async function initDir$1() {
	try {
		await promises.mkdir(AVATAR_DIR, { recursive: true });
	} catch (err) {
		console.error("Failed to create avatars directory:", err);
	}
}
initDir$1();
async function getAvatarConfig() {
	try {
		const data = await promises.readFile(CONFIG_PATH, "utf-8");
		return JSON.parse(data);
	} catch (err) {
		return {};
	}
}
async function saveAvatarConfig(config) {
	try {
		await promises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
	} catch (err) {
		console.error("Failed to save avatar config:", err);
	}
}
async function selectAndCopyAvatarImage(window, state) {
	const result = await dialog.showOpenDialog(window, {
		title: `Select Avatar Image for ${state}`,
		properties: ["openFile"],
		filters: [{
			name: "Images",
			extensions: [
				"png",
				"jpg",
				"jpeg",
				"gif",
				"webp"
			]
		}]
	});
	if (result.canceled || result.filePaths.length === 0) return null;
	const sourcePath = result.filePaths[0];
	const ext = extname(sourcePath);
	const destPath = join(AVATAR_DIR, `${state}_${Date.now()}${ext}`);
	try {
		await promises.copyFile(sourcePath, destPath);
		const config = await getAvatarConfig();
		if (config[state]) try {
			await promises.unlink(config[state]);
		} catch (e) {}
		config[state] = destPath;
		await saveAvatarConfig(config);
		return config;
	} catch (err) {
		console.error(`Failed to copy avatar image for ${state}:`, err);
		return null;
	}
}
async function resetAvatarImage(state) {
	const config = await getAvatarConfig();
	if (config[state]) {
		try {
			await promises.unlink(config[state]);
		} catch (e) {}
		delete config[state];
		await saveAvatarConfig(config);
	}
	return config;
}
async function saveGeneratedAvatarSet(images) {
	const config = await getAvatarConfig();
	for (const [state, base64Str] of Object.entries(images)) {
		const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");
		const destPath = join(AVATAR_DIR, `${state}_${Date.now()}.png`);
		try {
			await promises.writeFile(destPath, buffer);
			if (config[state]) try {
				await promises.unlink(config[state]);
			} catch (e) {}
			config[state] = destPath;
		} catch (err) {
			console.error(`Failed to save generated avatar image for ${state}:`, err);
		}
	}
	await saveAvatarConfig(config);
	return config;
}
//#endregion
//#region electron/avatarMarketplace.ts
var USER_DATA_PATH = app.getPath("userData");
var BUNDLES_DIR = join(USER_DATA_PATH, "bundles");
var MARKETPLACE_INDEX = join(BUNDLES_DIR, "marketplace.json");
var CLOUD_REPO_URL = "https://raw.githubusercontent.com/Qimmeh/My-Buddy-Marketplace/main";
async function initDir() {
	try {
		await promises.mkdir(BUNDLES_DIR, { recursive: true });
	} catch {
		await promises.mkdir(BUNDLES_DIR, { recursive: true });
	}
}
initDir();
function generateId(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
}
async function computeHash(config, charConfig) {
	const hash = createHash("sha256");
	const sortedStates = Object.keys(config).sort();
	for (const state of sortedStates) {
		if (state.startsWith("_")) continue;
		try {
			const buf = await promises.readFile(config[state]);
			hash.update(buf);
		} catch {}
	}
	if (charConfig) {
		hash.update(charConfig.characterName || "");
		hash.update(charConfig.themeColor || "");
		hash.update(charConfig.personalityPrompt || "");
	}
	return hash.digest("hex");
}
async function createBundle(name, author, description, config, charConfig) {
	const id = generateId(name);
	const bundleDir = join(BUNDLES_DIR, id);
	await promises.mkdir(bundleDir, { recursive: true });
	const images = {};
	for (const state of [
		"idle",
		"active",
		"very-active",
		"ready",
		"thinking",
		"walking-left",
		"walking-left-2",
		"walking-right",
		"walking-right-2",
		"paused",
		"dizzy",
		"blink",
		"glance-left",
		"glance-right",
		"look-around"
	]) if (config[state]) {
		const filename = state + (extname(config[state]) || ".png");
		try {
			await promises.copyFile(config[state], join(bundleDir, filename));
			images[state] = filename;
		} catch {}
	}
	const thumbnailState = Object.keys(images)[0] || "idle";
	const hash = await computeHash(config, charConfig);
	const existingBundles = await listBundles();
	for (const bundle of existingBundles) if (bundle.hash === hash) throw new Error("DUPLICATE_BUNDLE: This exact avatar set is already bundled as \"" + bundle.name + "\"");
	const manifest = {
		id,
		name,
		author,
		version: "1.0.0",
		description,
		images,
		hash,
		thumbnailState,
		createdAt: Date.now(),
		characterName: charConfig?.characterName,
		characterTips: charConfig?.characterTips,
		personalityPrompt: charConfig?.personalityPrompt,
		themeColor: charConfig?.themeColor
	};
	await promises.writeFile(join(bundleDir, "manifest.json"), JSON.stringify(manifest, null, 2));
	const marketplace = await loadMarketplace();
	marketplace.push({
		id,
		name,
		author,
		version: "1.0.0",
		description,
		hash,
		thumbnailState,
		createdAt: manifest.createdAt
	});
	marketplace.sort((a, b) => a.name.localeCompare(b.name));
	await promises.writeFile(MARKETPLACE_INDEX, JSON.stringify(marketplace, null, 2));
	return manifest;
}
async function installBundle(bundleId, targetConfig) {
	const bundleDir = join(BUNDLES_DIR, bundleId);
	const manifestPath = join(bundleDir, "manifest.json");
	let manifestData;
	try {
		manifestData = await promises.readFile(manifestPath, "utf-8");
	} catch (err) {
		try {
			const response = await fetch(`${CLOUD_REPO_URL}/${bundleId}/manifest.json`);
			if (!response.ok) throw new Error("Not found on cloud");
			const cloudManifest = await response.json();
			await promises.mkdir(bundleDir, { recursive: true });
			const stateOrder = Object.keys(cloudManifest.images);
			for (const state of stateOrder) {
				const filename = cloudManifest.images[state];
				const imgResponse = await fetch(`${CLOUD_REPO_URL}/${bundleId}/${filename}`);
				if (imgResponse.ok) {
					const buffer = await imgResponse.arrayBuffer();
					await promises.writeFile(join(bundleDir, filename), Buffer.from(buffer));
				}
			}
			await promises.writeFile(manifestPath, JSON.stringify(cloudManifest, null, 2));
			const marketplace = await loadMarketplace();
			marketplace.push({
				id: cloudManifest.id,
				name: cloudManifest.name,
				author: cloudManifest.author,
				version: cloudManifest.version,
				description: cloudManifest.description,
				hash: cloudManifest.hash,
				thumbnailState: cloudManifest.thumbnailState,
				createdAt: cloudManifest.createdAt
			});
			await promises.writeFile(MARKETPLACE_INDEX, JSON.stringify(marketplace, null, 2));
			manifestData = JSON.stringify(cloudManifest);
		} catch (cloudErr) {
			throw new Error("Bundle not found locally or on cloud: " + bundleId);
		}
	}
	try {
		const manifest = JSON.parse(manifestData);
		const newConfig = {};
		const stateOrder = Object.keys(manifest.images);
		for (const state of stateOrder) {
			const filename = manifest.images[state];
			const sourcePath = join(bundleDir, filename);
			try {
				await promises.access(sourcePath);
				const ext = extname(filename);
				const destPath = join(USER_DATA_PATH, "avatars", state + "_" + Date.now() + ext);
				await promises.copyFile(sourcePath, destPath);
				if (newConfig[state]) try {
					await promises.unlink(newConfig[state]);
				} catch {}
				newConfig[state] = destPath;
			} catch {}
		}
		newConfig["_bundleId"] = bundleId;
		newConfig["_bundleHash"] = manifest.hash;
		return {
			newConfig,
			manifest
		};
	} catch (err) {
		throw new Error("Failed to install bundle: " + bundleId);
	}
}
async function listBundles() {
	const marketplace = await loadMarketplace();
	const bundles = [];
	const localIds = /* @__PURE__ */ new Set();
	for (const entry of marketplace) try {
		const manifestPath = join(BUNDLES_DIR, entry.id, "manifest.json");
		const data = await promises.readFile(manifestPath, "utf-8");
		const manifest = JSON.parse(data);
		manifest.imageUrls = {};
		for (const state in manifest.images) manifest.imageUrls[state] = "file://" + join(BUNDLES_DIR, entry.id, manifest.images[state]).replace(/\\/g, "/");
		if (manifest.images && manifest.thumbnailState && manifest.images[manifest.thumbnailState]) manifest.thumbnailUrl = manifest.imageUrls[manifest.thumbnailState];
		manifest.isCloud = false;
		bundles.push(manifest);
		localIds.add(manifest.id);
	} catch {}
	try {
		const response = await fetch(`${CLOUD_REPO_URL}/index.json?t=${Date.now()}`);
		if (response.ok) {
			const cloudBundles = await response.json();
			for (const entry of cloudBundles) if (!localIds.has(entry.id)) {
				const manifestResponse = await fetch(`${CLOUD_REPO_URL}/${entry.id}/manifest.json?t=${Date.now()}`);
				if (manifestResponse.ok) {
					const manifest = await manifestResponse.json();
					manifest.imageUrls = {};
					for (const state in manifest.images) manifest.imageUrls[state] = `${CLOUD_REPO_URL}/${entry.id}/${manifest.images[state]}?t=${Date.now()}`;
					if (manifest.images && manifest.thumbnailState && manifest.images[manifest.thumbnailState]) manifest.thumbnailUrl = manifest.imageUrls[manifest.thumbnailState];
					manifest.isCloud = true;
					bundles.push(manifest);
				}
			}
		}
	} catch (err) {
		console.error("Failed to fetch cloud marketplace", err);
	}
	bundles.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
	return bundles;
}
async function loadMarketplace() {
	try {
		const data = await promises.readFile(MARKETPLACE_INDEX, "utf-8");
		return JSON.parse(data);
	} catch {
		return [];
	}
}
async function deleteBundle(bundleId) {
	const bundleDir = join(BUNDLES_DIR, bundleId);
	try {
		await promises.rm(bundleDir, {
			recursive: true,
			force: true
		});
	} catch {}
	const updated = (await loadMarketplace()).filter((b) => b.id !== bundleId);
	await promises.writeFile(MARKETPLACE_INDEX, JSON.stringify(updated, null, 2));
}
//#endregion
//#region electron/main.ts
loadSpotifyConfig();
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true");
app.commandLine.appendSwitch("disable-renderer-backgrounding", "true");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
var __dirname = dirname(fileURLToPath(import.meta.url));
var preload = join(__dirname, "preload.js");
var win = null;
var tray = null;
var isQuitting = false;
var userName = "User";
var USER_NAME_PATH = join(app.getPath("userData"), "user-name.json");
var px = 0, py = 0;
var vx = 2, vy = 1.5;
var targetX = 0, targetY = 0;
var idleFrames = 0;
var SIZE = 45;
var currentMode = "avatar";
var lastSendState = "";
var isGrabbed = false;
var microActionTimer = 0;
var moodTimer = 0;
var lastInteractionTime = Date.now();
var mood = "neutral";
var mouseNearby = false;
var proactiveTimer = 0;
var hasGreeted = false;
var wasMusicPlaying = false;
var proactiveMessages = [
	"*stretches*",
	"*wonders what you're doing*",
	"*hums a little tune*",
	"*looks around curiously*",
	"*feeling cozy today*",
	"*zzz... oh! was I sleeping?*",
	"*checks the time*",
	"*thinks about going for a walk*",
	"*notices you looking*",
	"*smiles*",
	"*daydreams*",
	"*plays with a stray pixel*",
	"*watches the cursor curiously*",
	"*feels a breeze*",
	"*notices something interesting*",
	"*happily wiggles*"
];
function sendMicroAction(action) {
	if (win && !win.isDestroyed()) win.webContents.send("micro-action", action);
}
function sendState(state) {
	if (win && !win.isDestroyed() && lastSendState !== state) {
		lastSendState = state;
		win.webContents.send("ai-state-change", state);
	}
}
async function loadUserName() {
	try {
		const data = await promises.readFile(USER_NAME_PATH, "utf-8");
		const parsed = JSON.parse(data);
		if (parsed.name) userName = parsed.name;
	} catch {}
}
async function saveUserName(name) {
	userName = name;
	try {
		await promises.writeFile(USER_NAME_PATH, JSON.stringify({ name }));
	} catch (err) {
		console.error("Failed to save user name:", err);
	}
	if (tray && !tray.isDestroyed()) tray.setToolTip(userName + " Buddy");
}
function pickNewTarget(wa) {
	const margin = SIZE * 2;
	let tx, ty, attempts = 0;
	do {
		tx = wa.x + margin + Math.random() * (wa.width - margin * 2);
		ty = wa.y + margin + Math.random() * (wa.height - margin * 2);
		attempts++;
	} while (Math.hypot(tx - px, ty - py) < 300 && attempts < 20);
	targetX = tx;
	targetY = ty;
	idleFrames = 0;
}
function startPhysicsLoop() {
	setInterval(() => {
		try {
			if (!win || win.isDestroyed() || currentMode !== "avatar" || isGrabbed) return;
			const wa = screen.getPrimaryDisplay().workArea;
			if (!wa || !wa.width || !wa.height) return;
			if (targetX === 0 && targetY === 0) pickNewTarget(wa);
			const dx = targetX - px;
			const dy = targetY - py;
			const dist = Math.hypot(dx, dy);
			if (dist < 3) {
				vx = 0;
				vy = 0;
				idleFrames++;
				if (idleFrames > 1800) pickNewTarget(wa);
				microActionTimer++;
				if (microActionTimer > 200 + Math.random() * 300) {
					microActionTimer = 0;
					const r = Math.random();
					if (r < .25) sendMicroAction("blink");
					else if (r < .5) sendMicroAction(Math.random() > .5 ? "glance-left" : "glance-right");
					else if (r < .75) sendMicroAction("look-around");
					else sendMicroAction("bounce");
				}
			} else {
				let baseSpeed = .8;
				if (mood === "bouncy") baseSpeed = 1.5 + Math.random() * .5;
				else if (mood === "happy") baseSpeed = 1 + Math.random() * .4;
				else if (mood === "sleepy") baseSpeed = .5 + Math.random() * .3;
				else baseSpeed = .8 + Math.random() * .4;
				if (mouseNearby) baseSpeed *= 1.3;
				const speed = baseSpeed;
				vx = dx / dist * speed;
				vy = dy / dist * speed + .15;
				if (Math.random() < .002) sendMicroAction("bounce");
			}
			px += vx;
			py += vy;
			if (px + SIZE >= wa.x + wa.width) {
				px = wa.x + wa.width - SIZE;
				vx = -(1.5 + Math.random() * 1.5);
				pickNewTarget(wa);
			} else if (px <= wa.x) {
				px = wa.x;
				vx = 1.5 + Math.random() * 1.5;
				pickNewTarget(wa);
			}
			if (py + SIZE >= wa.y + wa.height) {
				py = wa.y + wa.height - SIZE;
				vy = -(1 + Math.random() * 1);
				pickNewTarget(wa);
			} else if (py <= wa.y) {
				py = wa.y;
				vy = 1 + Math.random() * 1;
				pickNewTarget(wa);
			}
			if (mood === "sleepy" && dist < 3 && Math.random() < 5e-4) sendMicroAction("bounce");
			const musicPlaying = isSpotifyPlaying();
			if (musicPlaying && !wasMusicPlaying) {
				sendMicroAction("bounce");
				lastInteractionTime = Date.now();
				if (win && !win.isDestroyed()) {
					const reactions = [
						"*bops to the beat*",
						"*music makes me happy*",
						"*starts dancing*",
						"*feeling the rhythm*"
					];
					win.webContents.send("proactive-message", reactions[Math.floor(Math.random() * reactions.length)]);
				}
			} else if (!musicPlaying && wasMusicPlaying) hasGreeted = false;
			wasMusicPlaying = musicPlaying;
			moodTimer++;
			if (moodTimer > 600) {
				moodTimer = 0;
				const elapsed = Date.now() - lastInteractionTime;
				if (musicPlaying) {
					mood = "bouncy";
					return;
				}
				if (elapsed < 3e4) mood = "bouncy";
				else if (elapsed < 12e4) mood = "happy";
				else if (elapsed < 3e5) mood = "neutral";
				else mood = "sleepy";
				const hour = (/* @__PURE__ */ new Date()).getHours();
				if (hour >= 22 || hour < 7) mood = "sleepy";
				else if (hour >= 6 && hour < 12) {
					if (mood !== "sleepy") mood = "happy";
				} else if (hour >= 17 && hour < 22) {
					if (mood === "neutral") mood = "sleepy";
				}
			}
			if (currentMode === "avatar" && dist < 3 && mood !== "sleepy") {
				proactiveTimer++;
				if (proactiveTimer > 3600 + Math.random() * 3600) {
					proactiveTimer = 0;
					sendMicroAction("bounce");
					const msg = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)];
					if (win && !win.isDestroyed()) win.webContents.send("proactive-message", msg);
				}
			}
			if (mouseNearby) {
				if (Date.now() - lastInteractionTime > 3e5 && !hasGreeted) {
					hasGreeted = true;
					sendMicroAction("bounce");
					const greetings = [
						"Welcome back!",
						"There you are!",
						"You're back!",
						"Hello again!",
						"Was wondering where you went!"
					];
					const msg = greetings[Math.floor(Math.random() * greetings.length)];
					if (win && !win.isDestroyed()) win.webContents.send("proactive-message", msg);
				}
			} else hasGreeted = false;
			px = Math.max(wa.x, Math.min(px, wa.x + wa.width - SIZE));
			py = Math.max(wa.y, Math.min(py, wa.y + wa.height - SIZE));
			if (vx > 0) sendState("walking-right");
			else if (vx < 0) sendState("walking-left");
			else sendState("idle");
			win.setBounds({
				x: Math.round(px),
				y: Math.round(py),
				width: SIZE,
				height: SIZE
			});
		} catch (_) {}
	}, 1e3 / 60);
}
function createWindow() {
	win = new BrowserWindow({
		width: SIZE,
		height: SIZE,
		show: false,
		frame: false,
		transparent: true,
		skipTaskbar: true,
		alwaysOnTop: true,
		resizable: false,
		hasShadow: false,
		minWidth: 0,
		minHeight: 0,
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: true,
			backgroundThrottling: false,
			webSecurity: false
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
	else win.loadFile(join(__dirname, "../dist/index.html"));
	win.on("close", (e) => {
		if (!isQuitting) {
			e.preventDefault();
			win?.hide();
		}
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
	tray.setToolTip(userName + " Buddy");
	tray.on("click", () => toggleWindow());
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Settings...",
			click: () => {
				openSettingsWindow();
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				app.quit();
			}
		}
	]);
	tray.on("right-click", () => tray?.popUpContextMenu(contextMenu));
}
function toggleWindow() {
	if (!win) return;
	if (win.isVisible()) win.hide();
	else win.show();
}
ipcMain.on("resize-window", (_event, mode) => {
	if (!win || win.isDestroyed()) return;
	currentMode = mode;
	if (mode === "avatar") {
		isGrabbed = false;
		lastInteractionTime = Date.now();
		pickNewTarget(screen.getPrimaryDisplay().workArea);
	} else {
		const { workArea } = screen.getDisplayNearestPoint({
			x: Math.round(px),
			y: Math.round(py)
		});
		let fx = Math.round(px - 127.5);
		let fy = Math.round(py - 355);
		if (fx < workArea.x) fx = workArea.x;
		if (fx + 300 > workArea.x + workArea.width) fx = workArea.x + workArea.width - 300;
		if (fy < workArea.y) fy = workArea.y;
		win.setBounds({
			x: fx,
			y: fy,
			width: 300,
			height: 400
		});
		sendState("ready");
	}
});
ipcMain.on("drag-window", (_event, dx, dy) => {
	if (currentMode === "avatar") {
		isGrabbed = true;
		px += dx;
		py += dy;
		win?.setBounds({
			x: Math.round(px),
			y: Math.round(py),
			width: SIZE,
			height: SIZE
		});
	}
});
ipcMain.on("end-drag", (_event, _dragVx, _dragVy, wasDragged) => {
	if (currentMode === "avatar") {
		isGrabbed = false;
		lastInteractionTime = Date.now();
		if (wasDragged) {
			vx = Math.max(-20, Math.min(20, _dragVx));
			vy = _dragVy - 5;
			const wa = screen.getPrimaryDisplay().workArea;
			targetX = Math.max(wa.x + SIZE, Math.min(wa.x + wa.width - SIZE, px + vx * 30));
			targetY = Math.max(wa.y + SIZE, Math.min(wa.y + wa.height - SIZE, py + vy * 30));
			idleFrames = 0;
		}
	}
});
ipcMain.on("set-ignore-mouse-events", (_event, ignore, options) => {
	if (win && !win.isDestroyed()) if (options) win.setIgnoreMouseEvents(ignore, options);
	else win.setIgnoreMouseEvents(ignore);
});
ipcMain.on("mouse-position", (_event, x, y) => {
	mouseNearby = Math.abs(x) < 100 && Math.abs(y) < 100;
	if (mouseNearby) lastInteractionTime = Date.now();
});
ipcMain.on("navigate-to-point", (_event, x, y) => {
	if (currentMode !== "avatar") return;
	const area = screen.getPrimaryDisplay().workArea;
	targetX = Math.max(area.x + SIZE, Math.min(x, area.x + area.width - SIZE));
	targetY = Math.max(area.y + SIZE, Math.min(y, area.y + area.height - SIZE));
	idleFrames = 0;
});
app.whenReady().then(async () => {
	await loadUserName();
	createWindow();
	createTray();
	if (win) {
		const { workArea } = screen.getPrimaryDisplay();
		px = Math.round(workArea.x + workArea.width / 2 - SIZE / 2);
		py = Math.round(workArea.y + workArea.height / 2 - SIZE / 2);
		pickNewTarget(workArea);
		win.setBounds({
			x: px,
			y: py,
			width: SIZE,
			height: SIZE
		});
		win.setAlwaysOnTop(true, "screen-saver");
	}
	startPhysicsLoop();
	win?.show();
	globalShortcut.register("CommandOrControl+Shift+Space", () => toggleWindow());
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
	isQuitting = true;
});
app.on("will-quit", () => {
	tray?.destroy();
	globalShortcut.unregisterAll();
});
ipcMain.on("quit-app", () => {
	app.quit();
});
ipcMain.on("save-spotify-config", (_event, id, secret) => {
	saveSpotifyConfig(id, secret);
});
ipcMain.handle("get-spotify-config", async () => {
	return loadSpotifyConfig();
});
ipcMain.on("authenticate-spotify", (event) => {
	const w = BrowserWindow.fromWebContents(event.sender);
	if (w) authenticateSpotify(w).catch(console.error);
});
var settingsWin = null;
ipcMain.on("open-character-editor", () => {
	openSettingsWindow("character");
});
ipcMain.on("open-settings-window", () => {
	openSettingsWindow();
});
function openSettingsWindow(tab) {
	if (settingsWin && !settingsWin.isDestroyed()) {
		settingsWin.focus();
		if (tab) settingsWin.webContents.send("navigate-settings-tab", tab);
		return;
	}
	settingsWin = new BrowserWindow({
		width: 950,
		height: 750,
		show: true,
		frame: false,
		transparent: true,
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: true,
			webSecurity: false
		}
	});
	const query = tab ? `?window=settings&tab=${tab}` : `?window=settings`;
	if (process.env.VITE_DEV_SERVER_URL) settingsWin.loadURL(process.env.VITE_DEV_SERVER_URL + query);
	else settingsWin.loadFile(join(__dirname, "../dist/index.html"), { search: query.replace("?", "") });
	settingsWin.on("closed", () => {
		settingsWin = null;
	});
}
ipcMain.handle("get-character-config", async () => {
	return getCharacterConfig();
});
ipcMain.handle("save-character-config", async (_event, config) => {
	saveCharacterConfig(config);
	BrowserWindow.getAllWindows().forEach((w) => {
		if (!w.isDestroyed()) w.webContents.send("character-config-updated", config);
	});
	return true;
});
ipcMain.handle("get-avatar-config", async () => {
	return await getAvatarConfig();
});
ipcMain.handle("select-avatar-image", async (event, state) => {
	const w = BrowserWindow.fromWebContents(event.sender);
	if (w) {
		const config = await selectAndCopyAvatarImage(w, state);
		if (config) w.webContents.send("avatar-config-updated", config);
		return config;
	}
	return null;
});
ipcMain.handle("create-bundle", async (_event, name, author, description) => {
	const config = await getAvatarConfig();
	const charConfig = getCharacterConfig();
	try {
		return {
			success: true,
			manifest: await createBundle(name, author, description, config, charConfig)
		};
	} catch (err) {
		return {
			success: false,
			error: err.message
		};
	}
});
ipcMain.handle("install-bundle", async (_event, bundleId) => {
	const { newConfig, manifest } = await installBundle(bundleId, await getAvatarConfig());
	if (manifest.characterName || manifest.themeColor || manifest.personalityPrompt || manifest.characterTips) {
		const charConfig = getCharacterConfig();
		if (manifest.characterName) charConfig.characterName = manifest.characterName;
		if (manifest.themeColor) charConfig.themeColor = manifest.themeColor;
		if (manifest.personalityPrompt) charConfig.personalityPrompt = manifest.personalityPrompt;
		if (manifest.characterTips) charConfig.characterTips = manifest.characterTips;
		saveCharacterConfig(charConfig);
		BrowserWindow.getAllWindows().forEach((w) => {
			if (!w.isDestroyed()) w.webContents.send("character-config-updated", charConfig);
		});
	}
	const { join } = await import("node:path");
	const { promises: fs } = await import("node:fs");
	const CONFIG_PATH = join(app.getPath("userData"), "avatar-config.json");
	await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
	BrowserWindow.getAllWindows().forEach((w) => {
		if (!w.isDestroyed()) w.webContents.send("avatar-config-updated", newConfig);
	});
	return newConfig;
});
ipcMain.handle("list-bundles", async () => {
	return await listBundles();
});
ipcMain.handle("delete-bundle", async (_event, bundleId) => {
	await deleteBundle(bundleId);
	return { success: true };
});
ipcMain.handle("get-user-name", async () => {
	return userName;
});
ipcMain.handle("set-user-name", async (_event, name) => {
	await saveUserName(name);
	return { success: true };
});
ipcMain.on("update-tray-icon", async (_event, imagePath) => {
	if (!tray || tray.isDestroyed()) return;
	try {
		const icon = nativeImage.createFromPath(imagePath).resize({
			width: 24,
			height: 24
		});
		tray.setImage(icon);
	} catch {
		const iconPath = join(__dirname, "../dist/icon.png");
		try {
			const icon = nativeImage.createFromPath(iconPath).resize({
				width: 24,
				height: 24
			});
			tray.setImage(icon);
		} catch {}
	}
});
ipcMain.handle("reset-avatar-image", async (event, state) => {
	const w = BrowserWindow.fromWebContents(event.sender);
	if (w) {
		const config = await resetAvatarImage(state);
		w.webContents.send("avatar-config-updated", config);
		return config;
	}
	return null;
});
ipcMain.handle("save-generated-avatar-set", async (event, images) => {
	const w = BrowserWindow.fromWebContents(event.sender);
	if (w) {
		const config = await saveGeneratedAvatarSet(images);
		w.webContents.send("avatar-config-updated", config);
		return config;
	}
	return null;
});
//#endregion
export {};
