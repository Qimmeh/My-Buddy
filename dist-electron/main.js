import { BrowserWindow as e, Menu as t, Tray as n, app as r, dialog as i, globalShortcut as a, ipcMain as o, nativeImage as s, screen as c } from "electron";
import { dirname as l, extname as ee, join as u } from "node:path";
import { fileURLToPath as d } from "node:url";
import * as f from "node:fs";
import { promises as p } from "node:fs";
import { exec as m } from "node:child_process";
import { promisify as te } from "node:util";
import * as ne from "node:http";
import { createHash as re } from "node:crypto";
//#region electron/ramGuard.ts
var ie = te(m), ae = [
	"VALORANT.exe",
	"Minecraft.exe",
	"javaw.exe"
], oe = "http://localhost:11434/api/generate", se = "llama3", h = !1;
function ce(e) {
	setInterval(async () => {
		try {
			let { stdout: t } = await ie("tasklist"), n = ae.some((e) => t.toLowerCase().includes(e.toLowerCase()));
			n && !h ? (console.log("[RAM Guard] Game detected. Unloading Ollama model..."), await fetch(oe, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: se,
					keep_alive: 0
				})
			}).catch((e) => console.error("[RAM Guard] Failed to unload Ollama:", e)), h = !0, e.webContents.send("ram-guard-status", "sleeping")) : !n && h && (console.log("[RAM Guard] Game closed. AI is active."), h = !1, e.webContents.send("ram-guard-status", "active"));
		} catch (e) {
			console.error("[RAM Guard] Error checking processes:", e);
		}
	}, 1e4);
}
//#endregion
//#region electron/spotifyService.ts
var le = "http://127.0.0.1:8888/callback", g = u(r.getPath("userData"), "spotify_tokens.json"), _ = u(r.getPath("userData"), "spotify_config.json"), v = "", y = "", b = "", x = "", S = 0;
function ue() {
	if (f.existsSync(_)) try {
		let e = JSON.parse(f.readFileSync(_, "utf-8"));
		v = e.clientId || "", y = e.clientSecret || "";
	} catch (e) {
		console.error("Failed to load Spotify config", e);
	}
	return {
		clientId: v,
		clientSecret: y
	};
}
function de(e, t) {
	v = e, y = t, f.writeFileSync(_, JSON.stringify({
		clientId: v,
		clientSecret: y
	}));
}
function fe() {
	if (f.existsSync(g)) try {
		let e = JSON.parse(f.readFileSync(g, "utf-8"));
		b = e.access_token, x = e.refresh_token, S = e.expiration_time;
	} catch (e) {
		console.error("Failed to load Spotify tokens", e);
	}
}
function pe(e) {
	b = e.access_token, e.refresh_token && (x = e.refresh_token), S = Date.now() + (e.expires_in - 60) * 1e3, f.writeFileSync(g, JSON.stringify({
		access_token: b,
		refresh_token: x,
		expiration_time: S
	}));
}
async function C() {
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
			if (t.ok) pe(await t.json());
			else return null;
		} catch (e) {
			return console.error("Token refresh failed", e), null;
		}
	}
	return b;
}
function me(e) {
	return new Promise((e, t) => {
		if (!v || !y) {
			t("No Spotify credentials configured");
			return;
		}
		let n = `https://accounts.spotify.com/authorize?client_id=${v}&response_type=code&redirect_uri=${encodeURIComponent(le)}&scope=user-read-playback-state%20user-modify-playback-state`, r = ne.createServer(async (n, i) => {
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
								redirect_uri: le
							})
						});
						r.ok ? (pe(await r.json()), e()) : t("Failed to exchange code");
					} catch (e) {
						t(e);
					}
				} else i.writeHead(400, { "Content-Type": "text/plain" }), i.end("Failed to authenticate"), r.close(), t("No code in callback");
			}
		});
		r.listen(8888, () => {
			console.log("Listening for Spotify callback on port 8888"), m(`start "" "${n}"`);
		});
	});
}
async function he(e, t) {
	let n = await C();
	if (!n) try {
		await me(t), n = await C();
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
					console.error(`Spotify Play failed: ${e.status} ${t}`), m(`powershell -Command "${`
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
			} else m(`start "" "spotify:search:${encodeURIComponent(e)}"`);
		}
	} catch (e) {
		console.error("Spotify search/play error", e);
	}
	return null;
}
async function ge(e, t) {
	let n = await C();
	if (!n) try {
		await me(t), n = await C();
	} catch (e) {
		return console.error("Failed to auth Spotify for URI play", e), null;
	}
	if (!n) return null;
	let r = e.includes(":track:"), i = e.includes(":playlist:");
	try {
		let a = {};
		if (i) a.context_uri = e;
		else if (r) a.uris = [e];
		else return he(e, t);
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
		if (o.ok || m("powershell -Command \"" + ("$wshell = New-Object -ComObject wscript.shell; Start-Process \"" + e + "\"; Start-Sleep -Seconds 2; $wshell.AppActivate(\"Spotify\"); Start-Sleep -Milliseconds 500; $wshell.SendKeys(\"{ENTER}\")") + "\""), r) {
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
var _e = "", w = !1;
function ve() {
	return w;
}
function ye(e, t, n) {
	fe(), console.log("[Spotify Poller] Started - polling every 10s"), setInterval(async () => {
		console.log("[Spotify Poller] Tick - checking current track...");
		let e = await C();
		if (!e) {
			w = !1;
			return;
		}
		try {
			let r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${e}` } });
			if (r.status === 200) {
				let e = await r.json();
				if (e && e.item && e.is_playing) {
					w = !0;
					let r = e.item.id, i = e.item.name, a = e.item.artists[0]?.name || "Unknown Artist";
					r && r !== _e && (console.log("[Spotify Poller] New track detected:", i, "by", a), _e = r, _e !== "" && (t(`You are Zi Feng's Desktop Companion. He is now listening to the song "${i}" by "${a}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`), n && n(i, a, r)));
				} else w = !1;
			} else (r.status === 204 || r.status === 401 || r.status === 403) && (w = !1);
		} catch (e) {
			console.error("[Spotify Poller] Error:", e);
		}
	}, 1e4);
}
//#endregion
//#region electron/activeWindow.ts
var be = te(m), xe = "\nAdd-Type @\"\n  using System;\n  using System.Runtime.InteropServices;\n  public class Win32 {\n    [DllImport(\"user32.dll\")]\n    public static extern IntPtr GetForegroundWindow();\n    [DllImport(\"user32.dll\")]\n    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\n  }\n\"@\n$hwnd = [Win32]::GetForegroundWindow()\n$title = New-Object System.Text.StringBuilder 256\n[Win32]::GetWindowText($hwnd, $title, 256) > $null\n$title.ToString()\n";
async function Se() {
	try {
		let e = u(r.getPath("temp"), "active_win.ps1");
		f.writeFileSync(e, xe);
		let { stdout: t } = await be(`powershell -NoProfile -ExecutionPolicy Bypass -File "${e}"`);
		try {
			f.unlinkSync(e);
		} catch {}
		return t.trim();
	} catch (e) {
		return console.error("Failed to get active window title:", e), "";
	}
}
//#endregion
//#region electron/aiService.ts
var Ce = l(d(import.meta.url)), T = u(Ce, "../chat_history.json"), E = u(Ce, "../memory_store.json"), D = u(Ce, "../memory_box.json"), we = "http://127.0.0.1:11434/api/chat", Te = "llama3", Ee = 50, O = {
	songPlays: {},
	playlists: [],
	facts: []
};
function De() {
	if (f.existsSync(E)) try {
		let e = f.readFileSync(E, "utf-8");
		return JSON.parse(e);
	} catch (e) {
		console.error("Failed to parse memory_store.json, migrating...", e);
	}
	if (f.existsSync(D)) try {
		let e = f.readFileSync(D, "utf-8"), t = JSON.parse(e), n = {
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
		f.writeFileSync(E, JSON.stringify(n, null, 2));
		try {
			f.unlinkSync(D);
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
function k() {
	try {
		console.log("[Memory] Saving to:", E), f.writeFileSync(E, JSON.stringify(O, null, 2));
	} catch (e) {
		console.error("[Memory] Failed to save:", E, e);
	}
}
function Oe() {
	let e = [], t = O.facts.filter((e) => !e.startsWith("User is currently looking at:")), n = O.facts.find((e) => e.startsWith("User is currently looking at:"));
	if (t.length > 0) {
		e.push("=== FACTS ABOUT THE USER ===");
		for (let n of t) e.push("- " + n);
		e.push("");
	}
	n && (e.push("=== WHAT THE USER IS DOING RIGHT NOW ==="), e.push("- " + n), e.push(""));
	let r = Object.values(O.songPlays);
	if (r.length > 0) {
		e.push("=== SONGS THE USER HAS PLAYED ===");
		let t = [...r].sort((e, t) => t.count - e.count);
		for (let n of t) {
			let t = n.count > 1 ? "times" : "time";
			e.push("- \"" + n.name + "\" by " + n.artist + " — played " + n.count + " " + t + " (URI: " + n.uri + ")");
		}
		e.push("");
	}
	if (O.playlists.length > 0) {
		e.push("=== SAVED PLAYLISTS ===");
		for (let t of O.playlists) e.push("- " + t.name + " (URI: " + t.uri + ")");
		e.push("");
	}
	return e.join("\n") || "Nothing remembered yet.";
}
var ke = "You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.\nYou are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.\n\nHere is everything you remember about the user:\n\n{MEMORY_BOX}\n\n=== INSTRUCTIONS FOR MUSIC ===\nIf the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and then end your response with one of these tool calls:\n\n1. [TOOL:SPOTIFY:query]\n   Use this when the user asks for a song, artist, or playlist by name. Make the query accurate for Spotify's search. If it's a playlist, include the word 'playlist'.\n   Example: [TOOL:SPOTIFY:double take dhruv]\n   Example: [TOOL:SPOTIFY:chill vibes playlist]\n\n2. [TOOL:SPOTIFY_URI:spotify:xxx]\n   Use this when the user asks to play something that has a known URI in your memory (either from Songs the User Has Played or Saved Playlists).\n   Example: [TOOL:SPOTIFY_URI:spotify:track:12345]\n   Example: [TOOL:SPOTIFY_URI:spotify:playlist:abc123]\n\n3. [TOOL:SAVE_PLAYLIST:name|uri_or_url]\n   Use this when the user gives you a playlist URI or URL and asks you to remember it. The format is the playlist name, then a pipe |, then the URI or URL.\n   Example: [TOOL:SAVE_PLAYLIST:Chill Vibes|spotify:playlist:abc123]\n   Example: [TOOL:SAVE_PLAYLIST:Workout Mix|https://open.spotify.com/playlist/xyz789]\n\n=== INSTRUCTIONS FOR REMEMBERING ===\nIf the user tells you to remember something about them or their preferences, use:\n[TOOL:REMEMBER:fact]\nExample: [TOOL:REMEMBER:User's favorite color is blue]\n\nDo not include extra brackets except for the tool call. If the user asks what you remember or about their listening habits, check the memory sections above.", A = [];
function Ae() {
	try {
		if (f.existsSync(T)) {
			let e = f.readFileSync(T, "utf-8");
			A = JSON.parse(e);
		}
		O = De();
	} catch (e) {
		console.error("Failed to load memory", e);
	}
}
function je() {
	try {
		A.length > Ee && (A = A.slice(A.length - Ee)), f.writeFileSync(T, JSON.stringify(A)), k();
	} catch (e) {
		console.error("Failed to save memory", e);
	}
}
var Me = "";
function Ne(e) {
	Ae();
	var t = ne.request({
		hostname: "127.0.0.1",
		port: 11434,
		path: "/api/tags",
		method: "GET"
	}, function(e) {
		var t = "";
		e.on("data", function(e) {
			t += e;
		}), e.on("end", function() {
			try {
				var e = (JSON.parse(t).models || []).map(function(e) {
					return e.name;
				}).join(", ");
				console.log("[Diagnostic] Ollama reachable, models:", e);
			} catch (e) {
				console.error("[Diagnostic] Parse error:", e.message);
			}
		});
	});
	t.on("error", function(e) {
		console.error("[Diagnostic] Ollama unreachable:", e.message);
	}), t.end();
	let n = async (t) => {
		console.log("[Spontaneous] Calling Ollama with:", t.substring(0, 80) + "...");
		try {
			let n = JSON.stringify({
				model: Te,
				messages: [{
					role: "system",
					content: t
				}],
				stream: !1
			});
			console.log("[Spontaneous] POST body size:", n.length);
			let r = await new Promise(function(e, t) {
				var r = ne.request({
					hostname: "127.0.0.1",
					port: 11434,
					path: "/api/chat",
					method: "POST",
					headers: { "Content-Type": "application/json" }
				}, function(n) {
					var r = "";
					n.on("data", function(e) {
						r += e;
					}), n.on("end", function() {
						e(r);
					}), n.on("error", function(e) {
						t(e);
					});
				});
				r.on("error", function(e) {
					t(e);
				});
				var i = setTimeout(function() {
					console.log("[Spontaneous] Request timed out, destroying"), r.destroy(), t(/* @__PURE__ */ Error("Timeout"));
				}, 25e3);
				r.on("response", function() {
					console.log("[Spontaneous] Got response headers, clearing timeout"), clearTimeout(i);
				}), r.write(n), r.end();
			});
			console.log("[Spontaneous] Got response, parsing...");
			let i = JSON.parse(r);
			i.message && i.message.content ? (console.log("[Spontaneous] Ollama replied, sending to renderer:", i.message.content.substring(0, 60)), e.webContents.send("proactive-message", i.message.content)) : console.error("[Spontaneous] Unexpected Ollama response:", r.substring(0, 200));
		} catch (e) {
			console.error("Failed spontaneous reaction", e);
		}
	};
	setInterval(async () => {
		let e = await Se();
		e && e !== Me && !e.includes("My-Buddy") && !e.includes("Taskbar") && (Me = e, O.facts = O.facts.filter((e) => !e.startsWith("User is currently looking at:")), O.facts.push("User is currently looking at: " + e), k(), Math.random() < .3 && n("You are Zi Feng's Desktop Companion. He just opened an app called \"" + e + "\". Give a very short, 1-sentence spontaneous reaction or comment about it."));
	}, 15e3), ye(e, n, function(e, t, n) {
		console.log("[Memory] Poller detected song:", e, "by", t), j(e, t, "spotify:track:" + n);
	});
	let r = 0;
	setInterval(async () => {
		if (ve() || Math.random() >= .07) return;
		let e = Date.now();
		if (e - r < 720 * 1e3) return;
		r = e;
		let t = O.playlists, i = "";
		t.length > 0 && (i = "Here are his saved playlists:\n" + t.map(function(e) {
			return "- " + e.name + " (" + e.uri + ")";
		}).join("\n")), n("You are Zi Feng's Desktop Companion. He is not currently listening to music or playing anything on Spotify. Suggest if he would like to play one of his favorite playlists. " + i + " Keep it short, 1 sentence, casual and cute. Mention a specific playlist name if you know one.");
	}, 240 * 1e3), o.handle("send-to-ollama", async (t, n) => {
		A.push({
			role: "user",
			content: n
		});
		let r = await Pe(), i = r.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i), a = r.match(/\[?TOOL:SPOTIFY_URI:([^\]\n]+)\]?/i), o = r.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i), s = r.match(/\[?TOOL:SAVE_PLAYLIST:([^\]\n|]+)\|([^\]\n]+)\]?/i), c = r;
		if (a) {
			let t = a[1].trim();
			c = c.replace(a[0], "").trim(), c ||= "Playing from memory!", ge(t, e).then((e) => {
				e && e.uri.includes(":track:") && j(e.name, e.artist, e.uri);
			}).catch(console.error), A.push({
				role: "system",
				content: "System action executed: Playing Spotify URI " + t
			});
		}
		if (i) {
			let t = i[1].trim();
			c = c.replace(i[0], "").trim(), c ||= "Playing " + t + " on Spotify!", he(t, e).then((e) => {
				e && j(e.name, e.artist, e.uri);
			}).catch(console.error), A.push({
				role: "system",
				content: "System action executed: Searching and playing Spotify for " + t
			});
		}
		if (o) {
			let e = o[1].trim();
			c = c.replace(o[0], "").trim(), c ||= "Got it, I'll remember that!", O.facts.includes(e) || (O.facts.push(e), k()), A.push({
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
			c = c.replace(s[0], "").trim(), c ||= "Saved the playlist \"" + e + "\"!", O.playlists = O.playlists.filter((e) => e.uri !== t), O.playlists.push({
				name: e,
				uri: t
			}), k(), A.push({
				role: "system",
				content: "System action executed: Saved playlist \"" + e + "\" (" + t + ") to memory."
			});
		}
		return A.push({
			role: "assistant",
			content: c
		}), je(), c;
	}), o.on("add-manual-memory", (e, t) => {
		t.trim() !== "" && (O.facts.push(t.trim()), k());
	}), o.handle("get-memory-store", async () => JSON.parse(JSON.stringify(O))), o.handle("save-playlist-memory", async (e, t, n) => (O.playlists = O.playlists.filter((e) => e.uri !== n), O.playlists.push({
		name: t,
		uri: n
	}), k(), !0)), o.handle("clear-song-count", async (e, t) => (O.songPlays[t] && (delete O.songPlays[t], k()), !0));
}
function j(e, t, n) {
	console.log("[Memory] incrementSongPlay:", e, "by", t, "uri:", n), O.songPlays[n] ? (O.songPlays[n].count++, O.songPlays[n].name = e, O.songPlays[n].artist = t) : O.songPlays[n] = {
		name: e,
		artist: t,
		uri: n,
		count: 1
	}, k();
}
async function Pe() {
	try {
		let e = Oe(), t = [{
			role: "system",
			content: ke.replace("{MEMORY_BOX}", e)
		}, ...A], n = await fetch(we, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: Te,
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
//#endregion
//#region electron/avatarService.ts
var Fe = r.getPath("userData"), Ie = u(Fe, "avatars"), Le = u(Fe, "avatar-config.json");
async function Re() {
	try {
		await p.mkdir(Ie, { recursive: !0 });
	} catch (e) {
		console.error("Failed to create avatars directory:", e);
	}
}
Re();
async function M() {
	try {
		let e = await p.readFile(Le, "utf-8");
		return JSON.parse(e);
	} catch {
		return {};
	}
}
async function ze(e) {
	try {
		await p.writeFile(Le, JSON.stringify(e, null, 2));
	} catch (e) {
		console.error("Failed to save avatar config:", e);
	}
}
async function Be(e, t) {
	let n = await i.showOpenDialog(e, {
		title: `Select Avatar Image for ${t}`,
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
	if (n.canceled || n.filePaths.length === 0) return null;
	let r = n.filePaths[0], a = ee(r), o = u(Ie, `${t}_${Date.now()}${a}`);
	try {
		await p.copyFile(r, o);
		let e = await M();
		if (e[t]) try {
			await p.unlink(e[t]);
		} catch {}
		return e[t] = o, await ze(e), e;
	} catch (e) {
		return console.error(`Failed to copy avatar image for ${t}:`, e), null;
	}
}
async function Ve(e) {
	let t = await M();
	if (t[e]) {
		try {
			await p.unlink(t[e]);
		} catch {}
		delete t[e], await ze(t);
	}
	return t;
}
async function He(e) {
	let t = await M();
	for (let [n, r] of Object.entries(e)) {
		let e = r.replace(/^data:image\/\w+;base64,/, ""), i = Buffer.from(e, "base64"), a = u(Ie, `${n}_${Date.now()}.png`);
		try {
			if (await p.writeFile(a, i), t[n]) try {
				await p.unlink(t[n]);
			} catch {}
			t[n] = a;
		} catch (e) {
			console.error(`Failed to save generated avatar image for ${n}:`, e);
		}
	}
	return await ze(t), t;
}
//#endregion
//#region electron/avatarMarketplace.ts
var Ue = r.getPath("userData"), N = u(Ue, "bundles"), We = u(N, "marketplace.json");
async function Ge() {
	try {
		await p.mkdir(N, { recursive: !0 });
	} catch {
		await p.mkdir(N, { recursive: !0 });
	}
}
Ge();
function Ke(e) {
	return e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
}
async function qe(e) {
	let t = re("sha256"), n = Object.keys(e).sort();
	for (let r of n) try {
		let n = await p.readFile(e[r]);
		t.update(n);
	} catch {}
	return t.digest("hex");
}
async function Je(e, t, n, r) {
	let i = Ke(e), a = u(N, i);
	await p.mkdir(a, { recursive: !0 });
	let o = {};
	for (let e of [
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
	]) if (r[e]) {
		let t = e + (ee(r[e]) || ".png");
		try {
			await p.copyFile(r[e], u(a, t)), o[e] = t;
		} catch {}
	}
	let s = Object.keys(o)[0] || "idle", c = await qe(r), l = await Xe();
	for (let e of l) if (e.hash === c) throw Error("DUPLICATE_BUNDLE: This exact avatar set is already bundled as \"" + e.name + "\"");
	let d = {
		id: i,
		name: e,
		author: t,
		version: "1.0.0",
		description: n,
		images: o,
		hash: c,
		thumbnailState: s
	};
	await p.writeFile(u(a, "manifest.json"), JSON.stringify(d, null, 2));
	let f = await Ze();
	return f.push({
		id: i,
		name: e,
		author: t,
		version: "1.0.0",
		description: n,
		hash: c,
		thumbnailState: s
	}), f.sort((e, t) => e.name.localeCompare(t.name)), await p.writeFile(We, JSON.stringify(f, null, 2)), d;
}
async function Ye(e, t) {
	let n = u(N, e), r = u(n, "manifest.json");
	try {
		let t = await p.readFile(r, "utf-8"), i = JSON.parse(t), a = {}, o = Object.keys(i.images);
		for (let e of o) {
			let t = i.images[e], r = u(n, t);
			try {
				await p.access(r);
				let n = ee(t), i = u(Ue, "avatars", e + "_" + Date.now() + n);
				if (await p.copyFile(r, i), a[e]) try {
					await p.unlink(a[e]);
				} catch {}
				a[e] = i;
			} catch {}
		}
		return a._bundleId = e, a._bundleHash = i.hash, a;
	} catch {
		throw Error("Bundle not found: " + e);
	}
}
async function Xe() {
	let e = await Ze(), t = [];
	for (let n of e) try {
		let e = u(N, n.id, "manifest.json"), r = await p.readFile(e, "utf-8");
		t.push(JSON.parse(r));
	} catch {}
	return t;
}
async function Ze() {
	try {
		let e = await p.readFile(We, "utf-8");
		return JSON.parse(e);
	} catch {
		return [];
	}
}
ue(), r.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true"), r.commandLine.appendSwitch("disable-renderer-backgrounding", "true"), r.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
var P = l(d(import.meta.url)), Qe = u(P, "preload.js"), F = null, I = null, L = "User", $e = u(r.getPath("userData"), "user-name.json"), R = 0, z = 0, B = 2, V = 1.5, H = 0, U = 0, W = 0, G = 45, K = "avatar", et = "", q = !1, tt = 0, nt = 0, J = Date.now(), Y = "neutral", X = !1, rt = 0, Z = !1, it = !1, at = [
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
function Q(e) {
	F && !F.isDestroyed() && F.webContents.send("micro-action", e);
}
function ot(e) {
	F && !F.isDestroyed() && et !== e && (et = e, F.webContents.send("ai-state-change", e));
}
async function st() {
	try {
		let e = await p.readFile($e, "utf-8"), t = JSON.parse(e);
		t.name && (L = t.name);
	} catch {}
}
async function ct(e) {
	L = e;
	try {
		await p.writeFile($e, JSON.stringify({ name: e }));
	} catch (e) {
		console.error("Failed to save user name:", e);
	}
	I && !I.isDestroyed() && I.setToolTip(L + " Buddy");
}
function $(e) {
	let t = G * 2, n, r, i = 0;
	do
		n = e.x + t + Math.random() * (e.width - t * 2), r = e.y + t + Math.random() * (e.height - t * 2), i++;
	while (Math.hypot(n - R, r - z) < 300 && i < 20);
	H = n, U = r, W = 0;
}
function lt() {
	setInterval(() => {
		try {
			if (!F || F.isDestroyed() || K !== "avatar" || q) return;
			let e = c.getPrimaryDisplay().workArea;
			if (!e || !e.width || !e.height) return;
			H === 0 && U === 0 && $(e);
			let t = H - R, n = U - z, r = Math.hypot(t, n);
			if (r < 3) {
				if (B = 0, V = 0, W++, W > 1800 && $(e), tt++, tt > 200 + Math.random() * 300) {
					tt = 0;
					let e = Math.random();
					Q(e < .25 ? "blink" : e < .5 ? Math.random() > .5 ? "glance-left" : "glance-right" : e < .75 ? "look-around" : "bounce");
				}
			} else {
				let e = .8;
				e = Y === "bouncy" ? 1.5 + Math.random() * .5 : Y === "happy" ? 1 + Math.random() * .4 : Y === "sleepy" ? .5 + Math.random() * .3 : .8 + Math.random() * .4, X && (e *= 1.3);
				let i = e;
				B = t / r * i, V = n / r * i + .15, Math.random() < .002 && Q("bounce");
			}
			R += B, z += V, R + G >= e.x + e.width ? (R = e.x + e.width - G, B = -(1.5 + Math.random() * 1.5), $(e)) : R <= e.x && (R = e.x, B = 1.5 + Math.random() * 1.5, $(e)), z + G >= e.y + e.height ? (z = e.y + e.height - G, V = -(1 + Math.random() * 1), $(e)) : z <= e.y && (z = e.y, V = 1 + Math.random() * 1, $(e)), Y === "sleepy" && r < 3 && Math.random() < 5e-4 && Q("bounce");
			let i = ve();
			if (i && !it) {
				if (Q("bounce"), J = Date.now(), F && !F.isDestroyed()) {
					let e = [
						"*bops to the beat*",
						"*music makes me happy*",
						"*starts dancing*",
						"*feeling the rhythm*"
					];
					F.webContents.send("proactive-message", e[Math.floor(Math.random() * e.length)]);
				}
			} else !i && it && (Z = !1);
			if (it = i, nt++, nt > 600) {
				nt = 0;
				let e = Date.now() - J;
				if (i) {
					Y = "bouncy";
					return;
				}
				Y = e < 3e4 ? "bouncy" : e < 12e4 ? "happy" : e < 3e5 ? "neutral" : "sleepy";
				let t = (/* @__PURE__ */ new Date()).getHours();
				t >= 22 || t < 7 ? Y = "sleepy" : t >= 6 && t < 12 ? Y !== "sleepy" && (Y = "happy") : t >= 17 && t < 22 && Y === "neutral" && (Y = "sleepy");
			}
			if (K === "avatar" && r < 3 && Y !== "sleepy" && (rt++, rt > 3600 + Math.random() * 3600)) {
				rt = 0, Q("bounce");
				let e = at[Math.floor(Math.random() * at.length)];
				F && !F.isDestroyed() && F.webContents.send("proactive-message", e);
			}
			if (X) {
				if (Date.now() - J > 3e5 && !Z) {
					Z = !0, Q("bounce");
					let e = [
						"Welcome back!",
						"There you are!",
						"You're back!",
						"Hello again!",
						"Was wondering where you went!"
					], t = e[Math.floor(Math.random() * e.length)];
					F && !F.isDestroyed() && F.webContents.send("proactive-message", t);
				}
			} else Z = !1;
			R = Math.max(e.x, Math.min(R, e.x + e.width - G)), z = Math.max(e.y, Math.min(z, e.y + e.height - G)), ot(B > 0 ? "walking-right" : B < 0 ? "walking-left" : "idle"), F.setBounds({
				x: Math.round(R),
				y: Math.round(z),
				width: G,
				height: G
			});
		} catch {}
	}, 1e3 / 60);
}
function ut() {
	F = new e({
		width: G,
		height: G,
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
			preload: Qe,
			nodeIntegration: !0,
			contextIsolation: !0,
			backgroundThrottling: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? F.loadURL(process.env.VITE_DEV_SERVER_URL) : F.loadFile(u(P, "../dist/index.html")), F.on("close", (e) => {
		e.preventDefault(), F?.hide();
	}), ce(F), Ne(F);
}
function dt() {
	let e = u(P, "../public/icon.png");
	process.env.VITE_DEV_SERVER_URL || (e = u(P, "../dist/icon.png")), I = new n(s.createFromPath(e).resize({
		width: 24,
		height: 24
	})), I.setToolTip(L + " Buddy"), I.on("click", () => ft());
	let i = t.buildFromTemplate([
		{
			label: "Set Name...",
			click: () => {
				F && !F.isDestroyed() && F.webContents.send("set-user-name-prompt");
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				r.quit();
			}
		}
	]);
	I.on("right-click", () => I?.popUpContextMenu(i));
}
function ft() {
	F && (F.isVisible() ? F.hide() : F.show());
}
o.on("resize-window", (e, t) => {
	if (!(!F || F.isDestroyed())) if (K = t, t === "avatar") q = !1, J = Date.now(), $(c.getPrimaryDisplay().workArea);
	else {
		let { workArea: e } = c.getDisplayNearestPoint({
			x: Math.round(R),
			y: Math.round(z)
		}), t = Math.round(R - 127.5), n = Math.round(z - 355);
		t < e.x && (t = e.x), t + 300 > e.x + e.width && (t = e.x + e.width - 300), n < e.y && (n = e.y), F.setBounds({
			x: t,
			y: n,
			width: 300,
			height: 400
		}), ot("ready");
	}
}), o.on("drag-window", (e, t, n) => {
	K === "avatar" && (q = !0, R += t, z += n, F?.setBounds({
		x: Math.round(R),
		y: Math.round(z),
		width: G,
		height: G
	}));
}), o.on("end-drag", (e, t, n, r) => {
	if (K === "avatar" && (q = !1, J = Date.now(), r)) {
		B = Math.max(-20, Math.min(20, t)), V = n - 5;
		let e = c.getPrimaryDisplay().workArea;
		H = Math.max(e.x + G, Math.min(e.x + e.width - G, R + B * 30)), U = Math.max(e.y + G, Math.min(e.y + e.height - G, z + V * 30)), W = 0;
	}
}), o.on("set-ignore-mouse-events", (e, t, n) => {
	F && !F.isDestroyed() && (n ? F.setIgnoreMouseEvents(t, n) : F.setIgnoreMouseEvents(t));
}), o.on("mouse-position", (e, t, n) => {
	X = Math.abs(t) < 100 && Math.abs(n) < 100, X && (J = Date.now());
}), o.on("navigate-to-point", (e, t, n) => {
	if (K !== "avatar") return;
	let r = c.getPrimaryDisplay().workArea;
	H = Math.max(r.x + G, Math.min(t, r.x + r.width - G)), U = Math.max(r.y + G, Math.min(n, r.y + r.height - G)), W = 0;
}), r.whenReady().then(async () => {
	if (await st(), ut(), dt(), F) {
		let { workArea: e } = c.getPrimaryDisplay();
		R = Math.round(e.x + e.width / 2 - G / 2), z = Math.round(e.y + e.height / 2 - G / 2), $(e), F.setBounds({
			x: R,
			y: z,
			width: G,
			height: G
		}), F.setAlwaysOnTop(!0, "screen-saver");
	}
	lt(), F?.show(), a.register("CommandOrControl+Shift+Space", () => ft()), r.on("activate", () => {
		e.getAllWindows().length === 0 && ut();
	});
}), r.on("window-all-closed", () => {
	process.platform !== "darwin" && r.quit();
}), r.on("will-quit", () => {
	I?.destroy(), a.unregisterAll();
}), o.on("quit-app", () => {
	r.quit();
}), o.on("save-spotify-config", (e, t, n) => {
	de(t, n);
}), o.handle("get-spotify-config", async () => ue()), o.on("authenticate-spotify", (t) => {
	let n = e.fromWebContents(t.sender);
	n && me(n).catch(console.error);
}), o.handle("get-avatar-config", async () => await M()), o.handle("select-avatar-image", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await Be(r, n);
		return e && r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
}), o.handle("create-bundle", async (e, t, n, r) => {
	let i = await M();
	try {
		return {
			success: !0,
			manifest: await Je(t, n, r, i)
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
}), o.handle("install-bundle", async (e, t) => {
	let n = await Ye(t, await M()), { join: i } = await import("node:path"), { promises: a } = await import("node:fs"), o = i(r.getPath("userData"), "avatar-config.json");
	return await a.writeFile(o, JSON.stringify(n, null, 2)), n;
}), o.handle("list-bundles", async () => await Xe()), o.handle("get-user-name", async () => L), o.handle("set-user-name", async (e, t) => (await ct(t), { success: !0 })), o.on("update-tray-icon", async (e, t) => {
	if (!(!I || I.isDestroyed())) try {
		let e = s.createFromPath(t).resize({
			width: 24,
			height: 24
		});
		I.setImage(e);
	} catch {
		let e = u(P, "../dist/icon.png");
		try {
			let t = s.createFromPath(e).resize({
				width: 24,
				height: 24
			});
			I.setImage(t);
		} catch {}
	}
}), o.handle("reset-avatar-image", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await Ve(n);
		return r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
}), o.handle("save-generated-avatar-set", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await He(n);
		return r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
});
//#endregion
export {};
