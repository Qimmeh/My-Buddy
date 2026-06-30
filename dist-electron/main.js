import { BrowserWindow as e, Menu as t, Tray as n, app as r, dialog as i, globalShortcut as a, ipcMain as o, nativeImage as s, screen as c } from "electron";
import { dirname as l, extname as ee, join as u } from "node:path";
import { fileURLToPath as te } from "node:url";
import * as d from "node:fs";
import { promises as f } from "node:fs";
import { exec as p } from "node:child_process";
import { promisify as ne } from "node:util";
import * as re from "node:http";
import { createHash as ie } from "node:crypto";
//#region electron/ramGuard.ts
var ae = ne(p), oe = [
	"VALORANT.exe",
	"Minecraft.exe",
	"javaw.exe"
], se = "http://localhost:11434/api/generate", ce = "llama3", m = !1;
function le(e) {
	setInterval(async () => {
		try {
			let { stdout: t } = await ae("tasklist"), n = oe.some((e) => t.toLowerCase().includes(e.toLowerCase()));
			n && !m ? (console.log("[RAM Guard] Game detected. Unloading Ollama model..."), await fetch(se, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: ce,
					keep_alive: 0
				})
			}).catch((e) => console.error("[RAM Guard] Failed to unload Ollama:", e)), m = !0, e.webContents.send("ram-guard-status", "sleeping")) : !n && m && (console.log("[RAM Guard] Game closed. AI is active."), m = !1, e.webContents.send("ram-guard-status", "active"));
		} catch (e) {
			console.error("[RAM Guard] Error checking processes:", e);
		}
	}, 1e4);
}
//#endregion
//#region electron/characterConfig.ts
var ue = {
	characterName: "Raiden Shogun",
	characterTips: "from Genshin Impact",
	personalityPrompt: "You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.",
	themeColor: "#b026ff"
};
function de() {
	return u(r.getPath("userData"), "character_config.json");
}
function h() {
	let e = de();
	try {
		if (d.existsSync(e)) {
			let t = d.readFileSync(e, "utf-8"), n = JSON.parse(t);
			return {
				...ue,
				...n
			};
		}
	} catch (e) {
		console.error("Failed to read character config", e);
	}
	return { ...ue };
}
function fe(e) {
	let t = de();
	try {
		d.writeFileSync(t, JSON.stringify(e, null, 2));
	} catch (e) {
		console.error("Failed to save character config", e);
	}
}
//#endregion
//#region electron/spotifyService.ts
var pe = "http://127.0.0.1:8888/callback", me = u(r.getPath("userData"), "spotify_tokens.json"), he = u(r.getPath("userData"), "spotify_config.json"), g = "", _ = "", v = "", y = "", b = 0;
function ge() {
	if (d.existsSync(he)) try {
		let e = JSON.parse(d.readFileSync(he, "utf-8"));
		g = e.clientId || "", _ = e.clientSecret || "";
	} catch (e) {
		console.error("Failed to load Spotify config", e);
	}
	return {
		clientId: g,
		clientSecret: _
	};
}
function _e(e, t) {
	g = e, _ = t, d.writeFileSync(he, JSON.stringify({
		clientId: g,
		clientSecret: _
	}));
}
function ve() {
	if (d.existsSync(me)) try {
		let e = JSON.parse(d.readFileSync(me, "utf-8"));
		v = e.access_token, y = e.refresh_token, b = e.expiration_time;
	} catch (e) {
		console.error("Failed to load Spotify tokens", e);
	}
}
function ye(e) {
	v = e.access_token, e.refresh_token && (y = e.refresh_token), b = Date.now() + (e.expires_in - 60) * 1e3, d.writeFileSync(me, JSON.stringify({
		access_token: v,
		refresh_token: y,
		expiration_time: b
	}));
}
async function x() {
	if (!g || !_ || !v || !y) return null;
	if (Date.now() > b) {
		let e = Buffer.from(`${g}:${_}`).toString("base64");
		try {
			let t = await fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${e}`
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: y
				})
			});
			if (t.ok) ye(await t.json());
			else return null;
		} catch (e) {
			return console.error("Token refresh failed", e), null;
		}
	}
	return v;
}
function be(e) {
	return new Promise((e, t) => {
		if (!g || !_) {
			t("No Spotify credentials configured");
			return;
		}
		let n = `https://accounts.spotify.com/authorize?client_id=${g}&response_type=code&redirect_uri=${encodeURIComponent(pe)}&scope=user-read-playback-state%20user-modify-playback-state`, r = re.createServer(async (n, i) => {
			let a = new URL(n.url || "", `http://${n.headers.host}`);
			if (a.pathname === "/callback") {
				let n = a.searchParams.get("code");
				if (n) {
					i.writeHead(200, { "Content-Type": "text/html" }), i.end("<h1>Spotify authenticated successfully!</h1><p>You can close this window now.</p><script>window.close()<\/script>"), r.close();
					let a = Buffer.from(`${g}:${_}`).toString("base64");
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
								redirect_uri: pe
							})
						});
						r.ok ? (ye(await r.json()), e()) : t("Failed to exchange code");
					} catch (e) {
						t(e);
					}
				} else i.writeHead(400, { "Content-Type": "text/plain" }), i.end("Failed to authenticate"), r.close(), t("No code in callback");
			}
		});
		r.listen(8888, () => {
			console.log("Listening for Spotify callback on port 8888"), p(`start "" "${n}"`);
		});
	});
}
async function xe(e, t) {
	let n = await x();
	if (!n) try {
		await be(t), n = await x();
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
					console.error(`Spotify Play failed: ${e.status} ${t}`), p(`powershell -Command "${`
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
			} else p(`start "" "spotify:search:${encodeURIComponent(e)}"`);
		}
	} catch (e) {
		console.error("Spotify search/play error", e);
	}
	return null;
}
async function Se(e, t) {
	let n = await x();
	if (!n) try {
		await be(t), n = await x();
	} catch (e) {
		return console.error("Failed to auth Spotify for URI play", e), null;
	}
	if (!n) return null;
	let r = e.includes(":track:"), i = e.includes(":playlist:");
	try {
		let a = {};
		if (i) a.context_uri = e;
		else if (r) a.uris = [e];
		else return xe(e, t);
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
		if (o.ok || p("powershell -Command \"" + ("$wshell = New-Object -ComObject wscript.shell; Start-Process \"" + e + "\"; Start-Sleep -Seconds 2; $wshell.AppActivate(\"Spotify\"); Start-Sleep -Milliseconds 500; $wshell.SendKeys(\"{ENTER}\")") + "\""), r) {
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
var Ce = "", S = !1;
function we() {
	return S;
}
function Te(e, t, n) {
	ve(), console.log("[Spotify Poller] Started - polling every 10s"), setInterval(async () => {
		console.log("[Spotify Poller] Tick - checking current track...");
		let e = await x();
		if (!e) {
			S = !1;
			return;
		}
		try {
			let r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${e}` } });
			if (r.status === 200) {
				let e = await r.json();
				if (e && e.item && e.is_playing) {
					S = !0;
					let r = e.item.id, i = e.item.name, a = e.item.artists[0]?.name || "Unknown Artist";
					r && r !== Ce && (console.log("[Spotify Poller] New track detected:", i, "by", a), Ce = r, Ce !== "" && (t(`You are Zi Feng's Desktop Companion. He is now listening to the song "${i}" by "${a}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`), n && n(i, a, r)));
				} else S = !1;
			} else (r.status === 204 || r.status === 401 || r.status === 403) && (S = !1);
		} catch (e) {
			console.error("[Spotify Poller] Error:", e);
		}
	}, 1e4);
}
//#endregion
//#region electron/activeWindow.ts
var Ee = ne(p), De = "\nAdd-Type @\"\n  using System;\n  using System.Runtime.InteropServices;\n  public class Win32 {\n    [DllImport(\"user32.dll\")]\n    public static extern IntPtr GetForegroundWindow();\n    [DllImport(\"user32.dll\")]\n    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\n  }\n\"@\n$hwnd = [Win32]::GetForegroundWindow()\n$title = New-Object System.Text.StringBuilder 256\n[Win32]::GetWindowText($hwnd, $title, 256) > $null\n$title.ToString()\n";
async function Oe() {
	try {
		let e = u(r.getPath("temp"), "active_win.ps1");
		d.writeFileSync(e, De);
		let { stdout: t } = await Ee(`powershell -NoProfile -ExecutionPolicy Bypass -File "${e}"`);
		try {
			d.unlinkSync(e);
		} catch {}
		return t.trim();
	} catch (e) {
		return console.error("Failed to get active window title:", e), "";
	}
}
//#endregion
//#region electron/aiService.ts
l(te(import.meta.url));
var ke = u(r.getPath("userData"), "chat_history.json"), C = u(r.getPath("userData"), "memory_store.json"), Ae = u(r.getPath("userData"), "memory_box.json"), je = "http://127.0.0.1:11434/api/chat", Me = "llama3", Ne = 50, w = {
	songPlays: {},
	playlists: [],
	facts: []
};
function Pe() {
	if (d.existsSync(C)) try {
		let e = d.readFileSync(C, "utf-8");
		return JSON.parse(e);
	} catch (e) {
		console.error("Failed to parse memory_store.json, migrating...", e);
	}
	if (d.existsSync(Ae)) try {
		let e = d.readFileSync(Ae, "utf-8"), t = JSON.parse(e), n = {
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
		d.writeFileSync(C, JSON.stringify(n, null, 2));
		try {
			d.unlinkSync(Ae);
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
function T() {
	try {
		console.log("[Memory] Saving to:", C), d.writeFileSync(C, JSON.stringify(w, null, 2));
	} catch (e) {
		console.error("[Memory] Failed to save:", C, e);
	}
}
function Fe() {
	let e = [], t = w.facts.filter((e) => !e.startsWith("User is currently looking at:")), n = w.facts.find((e) => e.startsWith("User is currently looking at:"));
	if (t.length > 0) {
		e.push("=== FACTS ABOUT THE USER ===");
		for (let n of t) e.push("- " + n);
		e.push("");
	}
	n && (e.push("=== WHAT THE USER IS DOING RIGHT NOW ==="), e.push("- " + n), e.push(""));
	let r = Object.values(w.songPlays);
	if (r.length > 0) {
		e.push("=== SONGS THE USER HAS PLAYED ===");
		let t = [...r].sort((e, t) => t.count - e.count);
		for (let n of t) {
			let t = n.count > 1 ? "times" : "time";
			e.push("- \"" + n.name + "\" by " + n.artist + " — played " + n.count + " " + t + " (URI: " + n.uri + ")");
		}
		e.push("");
	}
	if (w.playlists.length > 0) {
		e.push("=== SAVED PLAYLISTS ===");
		for (let t of w.playlists) e.push("- " + t.name + " (URI: " + t.uri + ")");
		e.push("");
	}
	return e.join("\n") || "Nothing remembered yet.";
}
function Ie() {
	let e = h(), t = `You are the user's Desktop Companion. You are acting as the character ${e.characterName}`;
	return e.characterTips && (t += ` (${e.characterTips})`), t += `.\n${e.personalityPrompt}\nYou have memory of past conversations.\n`, t + "\nHere is everything you remember about the user:\n\n{MEMORY_BOX}";
}
var Le = "\n=== INSTRUCTIONS FOR MUSIC ===\nIf the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and then end your response with one of these tool calls:\n\n1. [TOOL:SPOTIFY:query]\n   Use this when the user asks for a song, artist, or playlist by name. Make the query accurate for Spotify's search. If it's a playlist, include the word 'playlist'.\n   Example: [TOOL:SPOTIFY:double take dhruv]\n   Example: [TOOL:SPOTIFY:chill vibes playlist]\n\n2. [TOOL:SPOTIFY_URI:spotify:xxx]\n   Use this when the user asks to play something that has a known URI in your memory (either from Songs the User Has Played or Saved Playlists).\n   Example: [TOOL:SPOTIFY_URI:spotify:track:12345]\n   Example: [TOOL:SPOTIFY_URI:spotify:playlist:abc123]\n\n3. [TOOL:SAVE_PLAYLIST:name|uri_or_url]\n   Use this when the user gives you a playlist URI or URL and asks you to remember it. The format is the playlist name, then a pipe |, then the URI or URL.\n   Example: [TOOL:SAVE_PLAYLIST:Chill Vibes|spotify:playlist:abc123]\n   Example: [TOOL:SAVE_PLAYLIST:Workout Mix|https://open.spotify.com/playlist/xyz789]\n\n=== INSTRUCTIONS FOR REMEMBERING ===\nIf the user tells you to remember something about them or their preferences, use:\n[TOOL:REMEMBER:fact]\nExample: [TOOL:REMEMBER:User's favorite color is blue]\n\nDo not include extra brackets except for the tool call. If the user asks what you remember or about their listening habits, check the memory sections above.", E = [];
function Re() {
	try {
		if (d.existsSync(ke)) {
			let e = d.readFileSync(ke, "utf-8");
			E = JSON.parse(e);
		}
		w = Pe();
	} catch (e) {
		console.error("Failed to load memory", e);
	}
}
function ze() {
	try {
		E.length > Ne && (E = E.slice(E.length - Ne)), d.writeFileSync(ke, JSON.stringify(E)), T();
	} catch (e) {
		console.error("Failed to save memory", e);
	}
}
var Be = "";
function Ve(e) {
	Re();
	var t = re.request({
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
				model: Me,
				messages: [{
					role: "system",
					content: t
				}],
				stream: !1
			});
			console.log("[Spontaneous] POST body size:", n.length);
			let r = await new Promise(function(e, t) {
				var r = re.request({
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
		let e = await Oe();
		e && e !== Be && !e.includes("My-Buddy") && !e.includes("Taskbar") && (Be = e, w.facts = w.facts.filter((e) => !e.startsWith("User is currently looking at:")), w.facts.push("User is currently looking at: " + e), T(), Math.random() < .3 && n(Ie() + "\n" + Le + "\nThe user just opened an app called \"" + e + "\". Give a very short, 1-sentence spontaneous reaction or comment about it."));
	}, 15e3), Te(e, n, function(e, t, n) {
		console.log("[Memory] Poller detected song:", e, "by", t), He(e, t, "spotify:track:" + n);
	});
	let r = 0;
	setInterval(async () => {
		if (we() || Math.random() >= .07) return;
		let e = Date.now();
		if (e - r < 720 * 1e3) return;
		r = e;
		let t = w.playlists, i = "";
		t.length > 0 && (i = "Here are his saved playlists:\n" + t.map(function(e) {
			return "- " + e.name + " (" + e.uri + ")";
		}).join("\n")), n(Ie() + "\n" + Le + "\nThe user is not currently listening to music or playing anything on Spotify. Suggest if they would like to play one of their favorite playlists. " + i + " Keep it short, 1 sentence, casual and cute. Mention a specific playlist name if you know one.");
	}, 240 * 1e3), o.handle("send-to-ollama", async (t, n) => {
		E.push({
			role: "user",
			content: n
		});
		let r = await Ue(), i = r.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i), a = r.match(/\[?TOOL:SPOTIFY_URI:([^\]\n]+)\]?/i), o = r.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i), s = r.match(/\[?TOOL:SAVE_PLAYLIST:([^\]\n|]+)\|([^\]\n]+)\]?/i), c = r;
		if (a) {
			let t = a[1].trim();
			c = c.replace(a[0], "").trim(), c ||= "Playing from memory!", Se(t, e).then((e) => {
				e && e.uri.includes(":track:") && He(e.name, e.artist, e.uri);
			}).catch(console.error), E.push({
				role: "system",
				content: "System action executed: Playing Spotify URI " + t
			});
		}
		if (i) {
			let t = i[1].trim();
			c = c.replace(i[0], "").trim(), c ||= "Playing " + t + " on Spotify!", xe(t, e).then((e) => {
				e && He(e.name, e.artist, e.uri);
			}).catch(console.error), E.push({
				role: "system",
				content: "System action executed: Searching and playing Spotify for " + t
			});
		}
		if (o) {
			let e = o[1].trim();
			c = c.replace(o[0], "").trim(), c ||= "Got it, I'll remember that!", w.facts.includes(e) || (w.facts.push(e), T()), E.push({
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
			c = c.replace(s[0], "").trim(), c ||= "Saved the playlist \"" + e + "\"!", w.playlists = w.playlists.filter((e) => e.uri !== t), w.playlists.push({
				name: e,
				uri: t
			}), T(), E.push({
				role: "system",
				content: "System action executed: Saved playlist \"" + e + "\" (" + t + ") to memory."
			});
		}
		return E.push({
			role: "assistant",
			content: c
		}), ze(), c;
	}), o.on("add-manual-memory", (e, t) => {
		t.trim() !== "" && (w.facts.push(t.trim()), T());
	}), o.handle("get-memory-store", async () => JSON.parse(JSON.stringify(w))), o.handle("save-playlist-memory", async (e, t, n) => (w.playlists = w.playlists.filter((e) => e.uri !== n), w.playlists.push({
		name: t,
		uri: n
	}), T(), !0)), o.handle("clear-song-count", async (e, t) => (w.songPlays[t] && (delete w.songPlays[t], T()), !0));
}
function He(e, t, n) {
	console.log("[Memory] incrementSongPlay:", e, "by", t, "uri:", n), w.songPlays[n] ? (w.songPlays[n].count++, w.songPlays[n].name = e, w.songPlays[n].artist = t) : w.songPlays[n] = {
		name: e,
		artist: t,
		uri: n,
		count: 1
	}, T();
}
async function Ue() {
	try {
		let e = Fe(), t = [{
			role: "system",
			content: (Ie() + "\n" + Le).replace("{MEMORY_BOX}", e)
		}, ...E], n = await fetch(je, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: Me,
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
var We = r.getPath("userData"), D = u(We, "avatars"), Ge = u(We, "avatar-config.json");
async function Ke() {
	try {
		await f.mkdir(D, { recursive: !0 });
	} catch (e) {
		console.error("Failed to create avatars directory:", e);
	}
}
Ke();
async function O() {
	try {
		let e = await f.readFile(Ge, "utf-8");
		return JSON.parse(e);
	} catch {
		return {};
	}
}
async function qe(e) {
	try {
		await f.writeFile(Ge, JSON.stringify(e, null, 2));
	} catch (e) {
		console.error("Failed to save avatar config:", e);
	}
}
async function Je(e, t) {
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
	let r = n.filePaths[0], a = ee(r), o = u(D, `${t}_${Date.now()}${a}`);
	try {
		await f.copyFile(r, o);
		let e = await O();
		if (e[t]) try {
			await f.unlink(e[t]);
		} catch {}
		return e[t] = o, await qe(e), e;
	} catch (e) {
		return console.error(`Failed to copy avatar image for ${t}:`, e), null;
	}
}
async function Ye(e) {
	let t = await O();
	if (t[e]) {
		try {
			await f.unlink(t[e]);
		} catch {}
		delete t[e], await qe(t);
	}
	return t;
}
async function Xe(e) {
	let t = await O();
	for (let [n, r] of Object.entries(e)) {
		let e = r.replace(/^data:image\/\w+;base64,/, ""), i = Buffer.from(e, "base64"), a = u(D, `${n}_${Date.now()}.png`);
		try {
			if (await f.writeFile(a, i), t[n]) try {
				await f.unlink(t[n]);
			} catch {}
			t[n] = a;
		} catch (e) {
			console.error(`Failed to save generated avatar image for ${n}:`, e);
		}
	}
	return await qe(t), t;
}
//#endregion
//#region electron/avatarMarketplace.ts
var Ze = r.getPath("userData"), k = u(Ze, "bundles"), A = u(k, "marketplace.json"), j = "https://raw.githubusercontent.com/Qimmeh/My-Buddy-Marketplace/main";
async function Qe() {
	try {
		await f.mkdir(k, { recursive: !0 });
	} catch {
		await f.mkdir(k, { recursive: !0 });
	}
}
Qe();
function $e(e) {
	return e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
}
async function et(e, t) {
	let n = ie("sha256"), r = Object.keys(e).sort();
	for (let t of r) if (!t.startsWith("_")) try {
		let r = await f.readFile(e[t]);
		n.update(r);
	} catch {}
	return t && (n.update(t.characterName || ""), n.update(t.themeColor || ""), n.update(t.personalityPrompt || "")), n.digest("hex");
}
async function tt(e, t, n, r, i) {
	let a = $e(e), o = u(k, a);
	await f.mkdir(o, { recursive: !0 });
	let s = {};
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
			await f.copyFile(r[e], u(o, t)), s[e] = t;
		} catch {}
	}
	let c = Object.keys(s)[0] || "idle", l = await et(r, i), te = await rt();
	for (let e of te) if (e.hash === l) throw Error("DUPLICATE_BUNDLE: This exact avatar set is already bundled as \"" + e.name + "\"");
	let d = {
		id: a,
		name: e,
		author: t,
		version: "1.0.0",
		description: n,
		images: s,
		hash: l,
		thumbnailState: c,
		createdAt: Date.now(),
		characterName: i?.characterName,
		characterTips: i?.characterTips,
		personalityPrompt: i?.personalityPrompt,
		themeColor: i?.themeColor
	};
	await f.writeFile(u(o, "manifest.json"), JSON.stringify(d, null, 2));
	let p = await M();
	return p.push({
		id: a,
		name: e,
		author: t,
		version: "1.0.0",
		description: n,
		hash: l,
		thumbnailState: c,
		createdAt: d.createdAt
	}), p.sort((e, t) => e.name.localeCompare(t.name)), await f.writeFile(A, JSON.stringify(p, null, 2)), d;
}
async function nt(e, t) {
	let n = u(k, e), r = u(n, "manifest.json"), i;
	try {
		i = await f.readFile(r, "utf-8");
	} catch {
		try {
			let t = await fetch(`${j}/${e}/manifest.json`);
			if (!t.ok) throw Error("Not found on cloud");
			let a = await t.json();
			await f.mkdir(n, { recursive: !0 });
			let o = Object.keys(a.images);
			for (let t of o) {
				let r = a.images[t], i = await fetch(`${j}/${e}/${r}`);
				if (i.ok) {
					let e = await i.arrayBuffer();
					await f.writeFile(u(n, r), Buffer.from(e));
				}
			}
			await f.writeFile(r, JSON.stringify(a, null, 2));
			let s = await M();
			s.push({
				id: a.id,
				name: a.name,
				author: a.author,
				version: a.version,
				description: a.description,
				hash: a.hash,
				thumbnailState: a.thumbnailState,
				createdAt: a.createdAt
			}), await f.writeFile(A, JSON.stringify(s, null, 2)), i = JSON.stringify(a);
		} catch {
			throw Error("Bundle not found locally or on cloud: " + e);
		}
	}
	try {
		let t = JSON.parse(i), r = {}, a = Object.keys(t.images);
		for (let e of a) {
			let i = t.images[e], a = u(n, i);
			try {
				await f.access(a);
				let t = ee(i), n = u(Ze, "avatars", e + "_" + Date.now() + t);
				if (await f.copyFile(a, n), r[e]) try {
					await f.unlink(r[e]);
				} catch {}
				r[e] = n;
			} catch {}
		}
		return r._bundleId = e, r._bundleHash = t.hash, {
			newConfig: r,
			manifest: t
		};
	} catch {
		throw Error("Failed to install bundle: " + e);
	}
}
async function rt() {
	let e = await M(), t = [], n = /* @__PURE__ */ new Set();
	for (let r of e) try {
		let e = u(k, r.id, "manifest.json"), i = await f.readFile(e, "utf-8"), a = JSON.parse(i);
		a.imageUrls = {};
		for (let e in a.images) a.imageUrls[e] = "file://" + u(k, r.id, a.images[e]).replace(/\\/g, "/");
		a.images && a.thumbnailState && a.images[a.thumbnailState] && (a.thumbnailUrl = a.imageUrls[a.thumbnailState]), a.isCloud = !1, t.push(a), n.add(a.id);
	} catch {}
	try {
		let e = await fetch(`${j}/index.json?t=${Date.now()}`);
		if (e.ok) {
			let r = await e.json();
			for (let e of r) if (!n.has(e.id)) {
				let n = await fetch(`${j}/${e.id}/manifest.json?t=${Date.now()}`);
				if (n.ok) {
					let r = await n.json();
					r.imageUrls = {};
					for (let t in r.images) r.imageUrls[t] = `${j}/${e.id}/${r.images[t]}?t=${Date.now()}`;
					r.images && r.thumbnailState && r.images[r.thumbnailState] && (r.thumbnailUrl = r.imageUrls[r.thumbnailState]), r.isCloud = !0, t.push(r);
				}
			}
		}
	} catch (e) {
		console.error("Failed to fetch cloud marketplace", e);
	}
	return t.sort((e, t) => (t.createdAt || 0) - (e.createdAt || 0)), t;
}
async function M() {
	try {
		let e = await f.readFile(A, "utf-8");
		return JSON.parse(e);
	} catch {
		return [];
	}
}
async function it(e) {
	let t = u(k, e);
	try {
		await f.rm(t, {
			recursive: !0,
			force: !0
		});
	} catch {}
	let n = (await M()).filter((t) => t.id !== e);
	await f.writeFile(A, JSON.stringify(n, null, 2));
}
ge(), r.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true"), r.commandLine.appendSwitch("disable-renderer-backgrounding", "true"), r.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
var N = l(te(import.meta.url)), at = u(N, "preload.js"), P = null, F = null, I = "User", ot = u(r.getPath("userData"), "user-name.json"), L = 0, R = 0, z = 2, B = 1.5, V = 0, H = 0, U = 0, W = 45, G = "avatar", st = "", K = !1, ct = 0, lt = 0, q = Date.now(), J = "neutral", Y = !1, ut = 0, X = !1, dt = !1, ft = [
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
function Z(e) {
	P && !P.isDestroyed() && P.webContents.send("micro-action", e);
}
function pt(e) {
	P && !P.isDestroyed() && st !== e && (st = e, P.webContents.send("ai-state-change", e));
}
async function mt() {
	try {
		let e = await f.readFile(ot, "utf-8"), t = JSON.parse(e);
		t.name && (I = t.name);
	} catch {}
}
async function ht(e) {
	I = e;
	try {
		await f.writeFile(ot, JSON.stringify({ name: e }));
	} catch (e) {
		console.error("Failed to save user name:", e);
	}
	F && !F.isDestroyed() && F.setToolTip(I + " Buddy");
}
function Q(e) {
	let t = W * 2, n, r, i = 0;
	do
		n = e.x + t + Math.random() * (e.width - t * 2), r = e.y + t + Math.random() * (e.height - t * 2), i++;
	while (Math.hypot(n - L, r - R) < 300 && i < 20);
	V = n, H = r, U = 0;
}
function gt() {
	setInterval(() => {
		try {
			if (!P || P.isDestroyed() || G !== "avatar" || K) return;
			let e = c.getPrimaryDisplay().workArea;
			if (!e || !e.width || !e.height) return;
			V === 0 && H === 0 && Q(e);
			let t = V - L, n = H - R, r = Math.hypot(t, n);
			if (r < 3) {
				if (z = 0, B = 0, U++, U > 1800 && Q(e), ct++, ct > 200 + Math.random() * 300) {
					ct = 0;
					let e = Math.random();
					Z(e < .25 ? "blink" : e < .5 ? Math.random() > .5 ? "glance-left" : "glance-right" : e < .75 ? "look-around" : "bounce");
				}
			} else {
				let e = .8;
				e = J === "bouncy" ? 1.5 + Math.random() * .5 : J === "happy" ? 1 + Math.random() * .4 : J === "sleepy" ? .5 + Math.random() * .3 : .8 + Math.random() * .4, Y && (e *= 1.3);
				let i = e;
				z = t / r * i, B = n / r * i + .15, Math.random() < .002 && Z("bounce");
			}
			L += z, R += B, L + W >= e.x + e.width ? (L = e.x + e.width - W, z = -(1.5 + Math.random() * 1.5), Q(e)) : L <= e.x && (L = e.x, z = 1.5 + Math.random() * 1.5, Q(e)), R + W >= e.y + e.height ? (R = e.y + e.height - W, B = -(1 + Math.random() * 1), Q(e)) : R <= e.y && (R = e.y, B = 1 + Math.random() * 1, Q(e)), J === "sleepy" && r < 3 && Math.random() < 5e-4 && Z("bounce");
			let i = we();
			if (i && !dt) {
				if (Z("bounce"), q = Date.now(), P && !P.isDestroyed()) {
					let e = [
						"*bops to the beat*",
						"*music makes me happy*",
						"*starts dancing*",
						"*feeling the rhythm*"
					];
					P.webContents.send("proactive-message", e[Math.floor(Math.random() * e.length)]);
				}
			} else !i && dt && (X = !1);
			if (dt = i, lt++, lt > 600) {
				lt = 0;
				let e = Date.now() - q;
				if (i) {
					J = "bouncy";
					return;
				}
				J = e < 3e4 ? "bouncy" : e < 12e4 ? "happy" : e < 3e5 ? "neutral" : "sleepy";
				let t = (/* @__PURE__ */ new Date()).getHours();
				t >= 22 || t < 7 ? J = "sleepy" : t >= 6 && t < 12 ? J !== "sleepy" && (J = "happy") : t >= 17 && t < 22 && J === "neutral" && (J = "sleepy");
			}
			if (G === "avatar" && r < 3 && J !== "sleepy" && (ut++, ut > 3600 + Math.random() * 3600)) {
				ut = 0, Z("bounce");
				let e = ft[Math.floor(Math.random() * ft.length)];
				P && !P.isDestroyed() && P.webContents.send("proactive-message", e);
			}
			if (Y) {
				if (Date.now() - q > 3e5 && !X) {
					X = !0, Z("bounce");
					let e = [
						"Welcome back!",
						"There you are!",
						"You're back!",
						"Hello again!",
						"Was wondering where you went!"
					], t = e[Math.floor(Math.random() * e.length)];
					P && !P.isDestroyed() && P.webContents.send("proactive-message", t);
				}
			} else X = !1;
			L = Math.max(e.x, Math.min(L, e.x + e.width - W)), R = Math.max(e.y, Math.min(R, e.y + e.height - W)), pt(z > 0 ? "walking-right" : z < 0 ? "walking-left" : "idle"), P.setBounds({
				x: Math.round(L),
				y: Math.round(R),
				width: W,
				height: W
			});
		} catch {}
	}, 1e3 / 60);
}
function _t() {
	P = new e({
		width: W,
		height: W,
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
			preload: at,
			nodeIntegration: !0,
			contextIsolation: !0,
			backgroundThrottling: !1,
			webSecurity: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? P.loadURL(process.env.VITE_DEV_SERVER_URL) : P.loadFile(u(N, "../dist/index.html")), P.on("close", (e) => {
		e.preventDefault(), P?.hide();
	}), le(P), Ve(P);
}
function vt() {
	let e = u(N, "../public/icon.png");
	process.env.VITE_DEV_SERVER_URL || (e = u(N, "../dist/icon.png")), F = new n(s.createFromPath(e).resize({
		width: 24,
		height: 24
	})), F.setToolTip(I + " Buddy"), F.on("click", () => yt());
	let i = t.buildFromTemplate([
		{
			label: "Set Name...",
			click: () => {
				P && !P.isDestroyed() && P.webContents.send("set-user-name-prompt");
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
	F.on("right-click", () => F?.popUpContextMenu(i));
}
function yt() {
	P && (P.isVisible() ? P.hide() : P.show());
}
o.on("resize-window", (e, t) => {
	if (!(!P || P.isDestroyed())) if (G = t, t === "avatar") K = !1, q = Date.now(), Q(c.getPrimaryDisplay().workArea);
	else {
		let { workArea: e } = c.getDisplayNearestPoint({
			x: Math.round(L),
			y: Math.round(R)
		}), t = Math.round(L - 127.5), n = Math.round(R - 355);
		t < e.x && (t = e.x), t + 300 > e.x + e.width && (t = e.x + e.width - 300), n < e.y && (n = e.y), P.setBounds({
			x: t,
			y: n,
			width: 300,
			height: 400
		}), pt("ready");
	}
}), o.on("drag-window", (e, t, n) => {
	G === "avatar" && (K = !0, L += t, R += n, P?.setBounds({
		x: Math.round(L),
		y: Math.round(R),
		width: W,
		height: W
	}));
}), o.on("end-drag", (e, t, n, r) => {
	if (G === "avatar" && (K = !1, q = Date.now(), r)) {
		z = Math.max(-20, Math.min(20, t)), B = n - 5;
		let e = c.getPrimaryDisplay().workArea;
		V = Math.max(e.x + W, Math.min(e.x + e.width - W, L + z * 30)), H = Math.max(e.y + W, Math.min(e.y + e.height - W, R + B * 30)), U = 0;
	}
}), o.on("set-ignore-mouse-events", (e, t, n) => {
	P && !P.isDestroyed() && (n ? P.setIgnoreMouseEvents(t, n) : P.setIgnoreMouseEvents(t));
}), o.on("mouse-position", (e, t, n) => {
	Y = Math.abs(t) < 100 && Math.abs(n) < 100, Y && (q = Date.now());
}), o.on("navigate-to-point", (e, t, n) => {
	if (G !== "avatar") return;
	let r = c.getPrimaryDisplay().workArea;
	V = Math.max(r.x + W, Math.min(t, r.x + r.width - W)), H = Math.max(r.y + W, Math.min(n, r.y + r.height - W)), U = 0;
}), r.whenReady().then(async () => {
	if (await mt(), _t(), vt(), P) {
		let { workArea: e } = c.getPrimaryDisplay();
		L = Math.round(e.x + e.width / 2 - W / 2), R = Math.round(e.y + e.height / 2 - W / 2), Q(e), P.setBounds({
			x: L,
			y: R,
			width: W,
			height: W
		}), P.setAlwaysOnTop(!0, "screen-saver");
	}
	gt(), P?.show(), a.register("CommandOrControl+Shift+Space", () => yt()), r.on("activate", () => {
		e.getAllWindows().length === 0 && _t();
	});
}), r.on("window-all-closed", () => {
	process.platform !== "darwin" && r.quit();
}), r.on("will-quit", () => {
	F?.destroy(), a.unregisterAll();
}), o.on("quit-app", () => {
	r.quit();
}), o.on("save-spotify-config", (e, t, n) => {
	_e(t, n);
}), o.handle("get-spotify-config", async () => ge()), o.on("authenticate-spotify", (t) => {
	let n = e.fromWebContents(t.sender);
	n && be(n).catch(console.error);
});
var $ = null;
o.on("open-character-editor", () => {
	if ($ && !$.isDestroyed()) {
		$.focus();
		return;
	}
	$ = new e({
		width: 600,
		height: 700,
		show: !0,
		autoHideMenuBar: !0,
		webPreferences: {
			preload: at,
			nodeIntegration: !0,
			contextIsolation: !0,
			webSecurity: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? $.loadURL(process.env.VITE_DEV_SERVER_URL + "?window=character-editor") : $.loadFile(u(N, "../dist/index.html"), { search: "window=character-editor" }), $.on("closed", () => {
		$ = null;
	});
}), o.handle("get-character-config", async () => h()), o.handle("save-character-config", async (t, n) => (fe(n), e.getAllWindows().forEach((e) => {
	e.isDestroyed() || e.webContents.send("character-config-updated", n);
}), !0)), o.handle("get-avatar-config", async () => await O()), o.handle("select-avatar-image", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await Je(r, n);
		return e && r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
}), o.handle("create-bundle", async (e, t, n, r) => {
	let i = await O(), a = h();
	try {
		return {
			success: !0,
			manifest: await tt(t, n, r, i, a)
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
}), o.handle("install-bundle", async (t, n) => {
	let { newConfig: i, manifest: a } = await nt(n, await O());
	if (a.characterName || a.themeColor || a.personalityPrompt || a.characterTips) {
		let t = h();
		a.characterName && (t.characterName = a.characterName), a.themeColor && (t.themeColor = a.themeColor), a.personalityPrompt && (t.personalityPrompt = a.personalityPrompt), a.characterTips && (t.characterTips = a.characterTips), fe(t), e.getAllWindows().forEach((e) => {
			e.isDestroyed() || e.webContents.send("character-config-updated", t);
		});
	}
	let { join: o } = await import("node:path"), { promises: s } = await import("node:fs"), c = o(r.getPath("userData"), "avatar-config.json");
	return await s.writeFile(c, JSON.stringify(i, null, 2)), e.getAllWindows().forEach((e) => {
		e.isDestroyed() || e.webContents.send("avatar-config-updated", i);
	}), i;
}), o.handle("list-bundles", async () => await rt()), o.handle("delete-bundle", async (e, t) => (await it(t), { success: !0 })), o.handle("get-user-name", async () => I), o.handle("set-user-name", async (e, t) => (await ht(t), { success: !0 })), o.on("update-tray-icon", async (e, t) => {
	if (!(!F || F.isDestroyed())) try {
		let e = s.createFromPath(t).resize({
			width: 24,
			height: 24
		});
		F.setImage(e);
	} catch {
		let e = u(N, "../dist/icon.png");
		try {
			let t = s.createFromPath(e).resize({
				width: 24,
				height: 24
			});
			F.setImage(t);
		} catch {}
	}
}), o.handle("reset-avatar-image", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await Ye(n);
		return r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
}), o.handle("save-generated-avatar-set", async (t, n) => {
	let r = e.fromWebContents(t.sender);
	if (r) {
		let e = await Xe(n);
		return r.webContents.send("avatar-config-updated", e), e;
	}
	return null;
});
//#endregion
export {};
