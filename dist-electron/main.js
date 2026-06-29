import { BrowserWindow as e, Menu as t, Tray as n, app as r, globalShortcut as i, ipcMain as a, nativeImage as o, screen as s } from "electron";
import { dirname as c, join as l } from "node:path";
import { fileURLToPath as u } from "node:url";
import { exec as d } from "node:child_process";
import { promisify as f } from "node:util";
import * as p from "node:fs";
import * as ee from "node:http";
//#region electron/ramGuard.ts
var te = f(d), ne = [
	"VALORANT.exe",
	"Minecraft.exe",
	"javaw.exe"
], re = "http://localhost:11434/api/generate", ie = "llama3", m = !1;
function ae(e) {
	setInterval(async () => {
		try {
			let { stdout: t } = await te("tasklist"), n = ne.some((e) => t.toLowerCase().includes(e.toLowerCase()));
			n && !m ? (console.log("[RAM Guard] Game detected. Unloading Ollama model..."), await fetch(re, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: ie,
					keep_alive: 0
				})
			}).catch((e) => console.error("[RAM Guard] Failed to unload Ollama:", e)), m = !0, e.webContents.send("ram-guard-status", "sleeping")) : !n && m && (console.log("[RAM Guard] Game closed. AI is active."), m = !1, e.webContents.send("ram-guard-status", "active"));
		} catch (e) {
			console.error("[RAM Guard] Error checking processes:", e);
		}
	}, 1e4);
}
//#endregion
//#region electron/spotifyService.ts
var h = "http://127.0.0.1:8888/callback", g = l(r.getPath("userData"), "spotify_tokens.json"), _ = l(r.getPath("userData"), "spotify_config.json"), v = "", y = "", b = "", x = "", S = 0;
function C() {
	if (p.existsSync(_)) try {
		let e = JSON.parse(p.readFileSync(_, "utf-8"));
		v = e.clientId || "", y = e.clientSecret || "";
	} catch (e) {
		console.error("Failed to load Spotify config", e);
	}
	return {
		clientId: v,
		clientSecret: y
	};
}
function oe(e, t) {
	v = e, y = t, p.writeFileSync(_, JSON.stringify({
		clientId: v,
		clientSecret: y
	}));
}
function se() {
	if (p.existsSync(g)) try {
		let e = JSON.parse(p.readFileSync(g, "utf-8"));
		b = e.access_token, x = e.refresh_token, S = e.expiration_time;
	} catch (e) {
		console.error("Failed to load Spotify tokens", e);
	}
}
function w(e) {
	b = e.access_token, e.refresh_token && (x = e.refresh_token), S = Date.now() + (e.expires_in - 60) * 1e3, p.writeFileSync(g, JSON.stringify({
		access_token: b,
		refresh_token: x,
		expiration_time: S
	}));
}
async function T() {
	if (!v || !y || !b || !x) return null;
	if (Date.now() > S) {
		let e = Buffer.from(`${v}:${y}`).toString("base64");
		try {
			let t = await fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${e}`
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: x
				})
			});
			if (t.ok) w(await t.json());
			else return null;
		} catch (e) {
			return console.error("Token refresh failed", e), null;
		}
	}
	return b;
}
function E(e) {
	return new Promise((e, t) => {
		if (!v || !y) {
			t("No Spotify credentials configured");
			return;
		}
		let n = `https://accounts.spotify.com/authorize?client_id=${v}&response_type=code&redirect_uri=${encodeURIComponent(h)}&scope=user-read-playback-state%20user-modify-playback-state`, r = ee.createServer(async (n, i) => {
			let a = new URL(n.url || "", `http://${n.headers.host}`);
			if (a.pathname === "/callback") {
				let n = a.searchParams.get("code");
				if (n) {
					i.writeHead(200, { "Content-Type": "text/html" }), i.end("<h1>Spotify authenticated successfully!</h1><p>You can close this window now.</p><script>window.close()<\/script>"), r.close();
					let a = Buffer.from(`${v}:${y}`).toString("base64");
					try {
						let r = await fetch("https://accounts.spotify.com/api/token", {
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded",
								Authorization: `Basic ${a}`
							},
							body: new URLSearchParams({
								grant_type: "authorization_code",
								code: n,
								redirect_uri: h
							})
						});
						r.ok ? (w(await r.json()), e()) : t("Failed to exchange code");
					} catch (e) {
						t(e);
					}
				} else i.writeHead(400, { "Content-Type": "text/plain" }), i.end("Failed to authenticate"), r.close(), t("No code in callback");
			}
		});
		r.listen(8888, () => {
			console.log("Listening for Spotify callback on port 8888"), d(`start "" "${n}"`);
		});
	});
}
async function D(e, t) {
	let n = await T();
	if (!n) try {
		await E(t), n = await T();
	} catch (e) {
		return console.error("Failed to auth Spotify during play", e), null;
	}
	if (!n) return null;
	try {
		let t = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(e)}&type=track,playlist&limit=1`, { headers: { Authorization: `Bearer ${n}` } });
		if (t.ok) {
			let r = await t.json(), i = null, a = "", o = "";
			if (r.playlists && r.playlists.items.length > 0 && e.toLowerCase().includes("playlist") ? (i = r.playlists.items[0].uri, a = r.playlists.items[0].name, o = r.playlists.items[0].owner.display_name) : r.tracks && r.tracks.items.length > 0 && (i = r.tracks.items[0].uri, a = r.tracks.items[0].name, o = r.tracks.items[0].artists[0].name), i) {
				let e = await fetch("https://api.spotify.com/v1/me/player/play", {
					method: "PUT",
					headers: {
						Authorization: `Bearer ${n}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						context_uri: i.includes("playlist") ? i : void 0,
						uris: i.includes("track") ? [i] : void 0
					})
				});
				if (e.status === 404) {
					let t = await fetch("https://api.spotify.com/v1/me/player/devices", { headers: { Authorization: `Bearer ${n}` } });
					if (t.ok) {
						let r = await t.json();
						if (r.devices && r.devices.length > 0) {
							let t = r.devices[0].id;
							e = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${t}`, {
								method: "PUT",
								headers: {
									Authorization: `Bearer ${n}`,
									"Content-Type": "application/json"
								},
								body: JSON.stringify({
									context_uri: i.includes("playlist") ? i : void 0,
									uris: i.includes("track") ? [i] : void 0
								})
							});
						}
					}
				}
				if (!e.ok) {
					let t = await e.text();
					console.error(`Spotify Play failed: ${e.status} ${t}`), d(`powershell -Command "${`
            $wshell = New-Object -ComObject wscript.shell
            Start-Process "${i}"
            Start-Sleep -Seconds 2
            $wshell.AppActivate("Spotify")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("{ENTER}")
          `.replace(/\n/g, ";")}"`);
				}
				return {
					name: a,
					artist: o,
					uri: i
				};
			} else d(`start "" "spotify:search:${encodeURIComponent(e)}"`);
		}
	} catch (e) {
		console.error("Spotify search/play error", e);
	}
	return null;
}
async function ce(e, t) {
	let n = await T();
	if (!n) try {
		await E(t), n = await T();
	} catch (e) {
		return console.error("Failed to auth Spotify for URI play", e), null;
	}
	if (!n) return null;
	let r = e.includes(":track:"), i = e.includes(":playlist:");
	try {
		let a = {};
		if (i) a.context_uri = e;
		else if (r) a.uris = [e];
		else return D(e, t);
		let o = await fetch("https://api.spotify.com/v1/me/player/play", {
			method: "PUT",
			headers: {
				Authorization: "Bearer " + n,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(a)
		});
		if (o.status === 404) {
			let e = await fetch("https://api.spotify.com/v1/me/player/devices", { headers: { Authorization: "Bearer " + n } });
			if (e.ok) {
				let t = await e.json();
				if (t.devices?.length > 0) {
					let e = t.devices[0].id;
					o = await fetch("https://api.spotify.com/v1/me/player/play?device_id=" + e, {
						method: "PUT",
						headers: {
							Authorization: "Bearer " + n,
							"Content-Type": "application/json"
						},
						body: JSON.stringify(a)
					});
				}
			}
		}
		if (o.ok || d("powershell -Command \"" + ("$wshell = New-Object -ComObject wscript.shell; Start-Process \"" + e + "\"; Start-Sleep -Seconds 2; $wshell.AppActivate(\"Spotify\"); Start-Sleep -Milliseconds 500; $wshell.SendKeys(\"{ENTER}\")") + "\""), r) {
			let t = e.split(":track:")[1], r = await fetch("https://api.spotify.com/v1/tracks/" + t, { headers: { Authorization: "Bearer " + n } });
			if (r.ok) {
				let t = await r.json();
				return {
					name: t.name,
					artist: t.artists[0]?.name || "Unknown",
					uri: e
				};
			}
		} else if (i) {
			let t = e.split(":playlist:")[1], r = await fetch("https://api.spotify.com/v1/playlists/" + t, { headers: { Authorization: "Bearer " + n } });
			if (r.ok) {
				let t = await r.json();
				return {
					name: t.name,
					artist: t.owner?.display_name || "Unknown",
					uri: e
				};
			}
		}
		return {
			name: "Track",
			artist: "Spotify",
			uri: e
		};
	} catch (e) {
		return console.error("playSpotifyUri error", e), null;
	}
}
var O = "";
function le(e, t) {
	se(), setInterval(async () => {
		let e = await T();
		if (e) try {
			let n = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${e}` } });
			if (n.status === 200) {
				let e = await n.json();
				if (e && e.item && e.is_playing) {
					let n = e.item.id, r = e.item.name, i = e.item.artists[0]?.name || "Unknown Artist";
					n && n !== O && (O = n, O !== "" && t(`You are Zi Feng's Desktop Companion. He is now listening to the song "${r}" by "${i}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`));
				}
			}
		} catch {}
	}, 1e4);
}
//#endregion
//#region electron/activeWindow.ts
var ue = f(d), de = "\nAdd-Type @\"\n  using System;\n  using System.Runtime.InteropServices;\n  public class Win32 {\n    [DllImport(\"user32.dll\")]\n    public static extern IntPtr GetForegroundWindow();\n    [DllImport(\"user32.dll\")]\n    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\n  }\n\"@\n$hwnd = [Win32]::GetForegroundWindow()\n$title = New-Object System.Text.StringBuilder 256\n[Win32]::GetWindowText($hwnd, $title, 256) > $null\n$title.ToString()\n";
async function fe() {
	try {
		let e = l(r.getPath("temp"), "active_win.ps1");
		p.writeFileSync(e, de);
		let { stdout: t } = await ue(`powershell -NoProfile -ExecutionPolicy Bypass -File "${e}"`);
		try {
			p.unlinkSync(e);
		} catch {}
		return t.trim();
	} catch (e) {
		return console.error("Failed to get active window title:", e), "";
	}
}
//#endregion
//#region electron/aiService.ts
var k = c(u(import.meta.url)), A = l(k, "../../chat_history.json"), j = l(k, "../../memory_store.json"), M = l(k, "../../memory_box.json"), N = "http://localhost:11434/api/chat", P = "llama3", F = 50, I = {
	songPlays: {},
	playlists: [],
	facts: []
};
function pe() {
	if (p.existsSync(j)) try {
		let e = p.readFileSync(j, "utf-8");
		return JSON.parse(e);
	} catch (e) {
		console.error("Failed to parse memory_store.json, migrating...", e);
	}
	if (p.existsSync(M)) try {
		let e = p.readFileSync(M, "utf-8"), t = JSON.parse(e), n = {
			songPlays: {},
			playlists: [],
			facts: []
		};
		for (let e of t) {
			let t = e.match(/User played music: "(.*)" by (.*) \(Spotify URI: (spotify:track:\w+)\)/);
			if (t) {
				let [, e, r, i] = t;
				n.songPlays[i] ? n.songPlays[i].count++ : n.songPlays[i] = {
					name: e,
					artist: r,
					uri: i,
					count: 1
				};
			} else n.facts.push(e);
		}
		p.writeFileSync(j, JSON.stringify(n, null, 2));
		try {
			p.unlinkSync(M);
		} catch {}
		return n;
	} catch (e) {
		console.error("Failed to migrate memory_box.json", e);
	}
	return {
		songPlays: {},
		playlists: [],
		facts: []
	};
}
function L() {
	try {
		p.writeFileSync(j, JSON.stringify(I, null, 2));
	} catch (e) {
		console.error("Failed to save memory store", e);
	}
}
function me() {
	let e = [], t = I.facts.filter((e) => !e.startsWith("User is currently looking at:")), n = I.facts.find((e) => e.startsWith("User is currently looking at:"));
	if (t.length > 0) {
		e.push("=== FACTS ABOUT THE USER ===");
		for (let n of t) e.push("- " + n);
		e.push("");
	}
	n && (e.push("=== WHAT THE USER IS DOING RIGHT NOW ==="), e.push("- " + n), e.push(""));
	let r = Object.values(I.songPlays);
	if (r.length > 0) {
		e.push("=== SONGS THE USER HAS PLAYED ===");
		let t = [...r].sort((e, t) => t.count - e.count);
		for (let n of t) {
			let t = n.count > 1 ? "times" : "time";
			e.push("- \"" + n.name + "\" by " + n.artist + " — played " + n.count + " " + t + " (URI: " + n.uri + ")");
		}
		e.push("");
	}
	if (I.playlists.length > 0) {
		e.push("=== SAVED PLAYLISTS ===");
		for (let t of I.playlists) e.push("- " + t.name + " (URI: " + t.uri + ")");
		e.push("");
	}
	return e.join("\n") || "Nothing remembered yet.";
}
var he = "You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.\nYou are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.\n\nHere is everything you remember about the user:\n\n{MEMORY_BOX}\n\n=== INSTRUCTIONS FOR MUSIC ===\nIf the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and then end your response with one of these tool calls:\n\n1. [TOOL:SPOTIFY:query]\n   Use this when the user asks for a song, artist, or playlist by name. Make the query accurate for Spotify's search. If it's a playlist, include the word 'playlist'.\n   Example: [TOOL:SPOTIFY:double take dhruv]\n   Example: [TOOL:SPOTIFY:chill vibes playlist]\n\n2. [TOOL:SPOTIFY_URI:spotify:xxx]\n   Use this when the user asks to play something that has a known URI in your memory (either from Songs the User Has Played or Saved Playlists).\n   Example: [TOOL:SPOTIFY_URI:spotify:track:12345]\n   Example: [TOOL:SPOTIFY_URI:spotify:playlist:abc123]\n\n3. [TOOL:SAVE_PLAYLIST:name|uri_or_url]\n   Use this when the user gives you a playlist URI or URL and asks you to remember it. The format is the playlist name, then a pipe |, then the URI or URL.\n   Example: [TOOL:SAVE_PLAYLIST:Chill Vibes|spotify:playlist:abc123]\n   Example: [TOOL:SAVE_PLAYLIST:Workout Mix|https://open.spotify.com/playlist/xyz789]\n\n=== INSTRUCTIONS FOR REMEMBERING ===\nIf the user tells you to remember something about them or their preferences, use:\n[TOOL:REMEMBER:fact]\nExample: [TOOL:REMEMBER:User's favorite color is blue]\n\nDo not include extra brackets except for the tool call. If the user asks what you remember or about their listening habits, check the memory sections above.", R = [];
function ge() {
	try {
		if (p.existsSync(A)) {
			let e = p.readFileSync(A, "utf-8");
			R = JSON.parse(e);
		}
		I = pe();
	} catch (e) {
		console.error("Failed to load memory", e);
	}
}
function _e() {
	try {
		R.length > F && (R = R.slice(R.length - F)), p.writeFileSync(A, JSON.stringify(R)), L();
	} catch (e) {
		console.error("Failed to save memory", e);
	}
}
var z = "";
function ve(e) {
	ge();
	let t = async (t) => {
		try {
			let n = await fetch(N, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: P,
					messages: [{
						role: "system",
						content: t
					}],
					stream: !1
				})
			});
			if (n.ok) {
				let t = await n.json();
				e.webContents.send("proactive-message", t.message.content);
			}
		} catch (e) {
			console.error("Failed spontaneous reaction", e);
		}
	};
	setInterval(async () => {
		let e = await fe();
		e && e !== z && !e.includes("My-Buddy") && !e.includes("Taskbar") && (z = e, I.facts = I.facts.filter((e) => !e.startsWith("User is currently looking at:")), I.facts.push("User is currently looking at: " + e), L(), Math.random() < .3 && t("You are Zi Feng's Desktop Companion. He just opened an app called \"" + e + "\". Give a very short, 1-sentence spontaneous reaction or comment about it."));
	}, 15e3), le(e, t), a.handle("send-to-ollama", async (t, n) => {
		R.push({
			role: "user",
			content: n
		});
		let r = await ye(), i = r.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i), a = r.match(/\[?TOOL:SPOTIFY_URI:([^\]\n]+)\]?/i), o = r.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i), s = r.match(/\[?TOOL:SAVE_PLAYLIST:([^\]\n|]+)\|([^\]\n]+)\]?/i), c = r;
		if (a) {
			let t = a[1].trim();
			c = c.replace(a[0], "").trim(), c ||= "Playing from memory!", ce(t, e).then((e) => {
				e && e.uri.includes(":track:") && B(e.name, e.artist, e.uri);
			}).catch(console.error), R.push({
				role: "system",
				content: "System action executed: Playing Spotify URI " + t
			});
		}
		if (i) {
			let t = i[1].trim();
			c = c.replace(i[0], "").trim(), c ||= "Playing " + t + " on Spotify!", D(t, e).then((e) => {
				e && B(e.name, e.artist, e.uri);
			}).catch(console.error), R.push({
				role: "system",
				content: "System action executed: Searching and playing Spotify for " + t
			});
		}
		if (o) {
			let e = o[1].trim();
			c = c.replace(o[0], "").trim(), c ||= "Got it, I'll remember that!", I.facts.includes(e) || (I.facts.push(e), L()), R.push({
				role: "system",
				content: "System action executed: Saved \"" + e + "\" to long term memory."
			});
		}
		if (s) {
			let e = s[1].trim(), t = s[2].trim(), n = t.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
			if (n) {
				let e = n[1], r = n[2];
				t = "spotify:" + e + ":" + r;
			}
			c = c.replace(s[0], "").trim(), c ||= "Saved the playlist \"" + e + "\"!", I.playlists = I.playlists.filter((e) => e.uri !== t), I.playlists.push({
				name: e,
				uri: t
			}), L(), R.push({
				role: "system",
				content: "System action executed: Saved playlist \"" + e + "\" (" + t + ") to memory."
			});
		}
		return R.push({
			role: "assistant",
			content: c
		}), _e(), c;
	}), a.on("add-manual-memory", (e, t) => {
		t.trim() !== "" && (I.facts.push(t.trim()), L());
	}), a.handle("get-memory-store", async () => JSON.parse(JSON.stringify(I))), a.handle("save-playlist-memory", async (e, t, n) => (I.playlists = I.playlists.filter((e) => e.uri !== n), I.playlists.push({
		name: t,
		uri: n
	}), L(), !0)), a.handle("clear-song-count", async (e, t) => (I.songPlays[t] && (delete I.songPlays[t], L()), !0));
}
function B(e, t, n) {
	I.songPlays[n] ? (I.songPlays[n].count++, I.songPlays[n].name = e, I.songPlays[n].artist = t) : I.songPlays[n] = {
		name: e,
		artist: t,
		uri: n,
		count: 1
	}, L();
}
async function ye() {
	try {
		let e = me(), t = [{
			role: "system",
			content: he.replace("{MEMORY_BOX}", e)
		}, ...R], n = await fetch(N, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: P,
				messages: t,
				stream: !1
			})
		});
		if (!n.ok) {
			let e = await n.text();
			throw Error("HTTP error! status: " + n.status + ", body: " + e);
		}
		return (await n.json()).message.content;
	} catch (e) {
		return console.error("[Ollama API] Error:", e.message), e.message.includes("404") ? "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it." : "Connection to local AI failed. Is Ollama running?";
	}
}
C(), r.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true"), r.commandLine.appendSwitch("disable-renderer-backgrounding", "true"), r.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
var V = c(u(import.meta.url)), be = l(V, "preload.js"), H = null, U = null, W = 0, G = 0, K = 2, q = 1.5, J = 45, Y = "avatar", X = "", Z = !1;
function Q(e) {
	H && !H.isDestroyed() && X !== e && (X = e, H.webContents.send("ai-state-change", e));
}
function xe() {
	setInterval(() => {
		try {
			if (!H || H.isDestroyed() || Y !== "avatar" || Z) return;
			let e = s.getPrimaryDisplay().workArea;
			if (!e || !e.width || !e.height) return;
			W += K, G += q, W + J >= e.x + e.width ? (W = e.x + e.width - J, K = -(1.5 + Math.random() * 1.5)) : W <= e.x && (W = e.x, K = 1.5 + Math.random() * 1.5), G + J >= e.y + e.height ? (G = e.y + e.height - J, q = -(1 + Math.random() * 1)) : G <= e.y && (G = e.y, q = 1 + Math.random() * 1), W = Math.max(e.x, Math.min(W, e.x + e.width - J)), G = Math.max(e.y, Math.min(G, e.y + e.height - J)), Q(K > 0 ? "walking-right" : K < 0 ? "walking-left" : "idle"), H.setBounds({
				x: Math.round(W),
				y: Math.round(G),
				width: J,
				height: J
			});
		} catch {}
	}, 1e3 / 60);
}
function Se() {
	H = new e({
		width: J,
		height: J,
		show: !1,
		frame: !1,
		transparent: !0,
		skipTaskbar: !0,
		alwaysOnTop: !0,
		resizable: !1,
		hasShadow: !1,
		minWidth: 0,
		minHeight: 0,
		webPreferences: {
			preload: be,
			nodeIntegration: !0,
			contextIsolation: !0,
			backgroundThrottling: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? H.loadURL(process.env.VITE_DEV_SERVER_URL) : H.loadFile(l(V, "../dist/index.html")), H.on("close", (e) => {
		e.preventDefault(), H?.hide();
	}), ae(H), ve(H);
}
function Ce() {
	let e = l(V, "../public/icon.png");
	process.env.VITE_DEV_SERVER_URL || (e = l(V, "../dist/icon.png")), U = new n(o.createFromPath(e).resize({
		width: 24,
		height: 24
	})), U.setToolTip("Zi Feng Buddy"), U.on("click", () => $());
	let i = t.buildFromTemplate([{
		label: "Quit",
		click: () => {
			r.exit();
		}
	}]);
	U.on("right-click", () => U?.popUpContextMenu(i));
}
function $() {
	H && (H.isVisible() ? H.hide() : H.show());
}
a.on("resize-window", (e, t) => {
	if (!(!H || H.isDestroyed())) if (Y = t, t === "avatar") Z = !1;
	else {
		let { workArea: e } = s.getDisplayNearestPoint({
			x: Math.round(W),
			y: Math.round(G)
		}), t = Math.round(W - 127.5), n = Math.round(G - 355);
		t < e.x && (t = e.x), t + 300 > e.x + e.width && (t = e.x + e.width - 300), n < e.y && (n = e.y), H.setBounds({
			x: t,
			y: n,
			width: 300,
			height: 400
		}), Q("ready");
	}
}), a.on("drag-window", (e, t, n) => {
	Y === "avatar" && (Z = !0, W += t, G += n, H?.setBounds({
		x: Math.round(W),
		y: Math.round(G),
		width: J,
		height: J
	}));
}), a.on("end-drag", (e, t, n, r) => {
	Y === "avatar" && (Z = !1, r && (K = Math.max(-20, Math.min(20, t)), q = n - 5));
}), a.on("set-ignore-mouse-events", (e, t, n) => {
	H && !H.isDestroyed() && (n ? H.setIgnoreMouseEvents(t, n) : H.setIgnoreMouseEvents(t));
}), r.whenReady().then(() => {
	if (Se(), Ce(), H) {
		let { workArea: e } = s.getPrimaryDisplay();
		W = Math.round(e.x + e.width / 2 - J / 2), G = Math.round(e.y + e.height / 2 - J / 2), H.setBounds({
			x: W,
			y: G,
			width: J,
			height: J
		}), H.setAlwaysOnTop(!0, "screen-saver");
	}
	xe(), H?.show(), i.register("CommandOrControl+Shift+Space", () => $()), r.on("activate", () => {
		e.getAllWindows().length === 0 && Se();
	});
}), r.on("window-all-closed", () => {
	process.platform !== "darwin" && r.quit();
}), r.on("will-quit", () => {
	i.unregisterAll();
}), a.on("quit-app", () => {
	r.exit();
}), a.on("save-spotify-config", (e, t, n) => {
	oe(t, n);
}), a.handle("get-spotify-config", async () => C()), a.on("authenticate-spotify", (t) => {
	let n = e.fromWebContents(t.sender);
	n && E(n).catch(console.error);
});
//#endregion
export {};
