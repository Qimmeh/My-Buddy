import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'node:fs'
import { join, dirname } from 'node:path'
import * as http from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HISTORY_FILE = join(__dirname, '../chat_history.json')
const MEMORY_STORE_FILE = join(__dirname, '../memory_store.json')
const MEMORY_BOX_FILE = join(__dirname, '../memory_box.json')
const OLLAMA_API = 'http://127.0.0.1:11434/api/chat'
const MODEL_NAME = 'llama3'
const MAX_MEMORY = 50

// ====== Structured Memory Types ======
interface PlayRecord {
  name: string
  artist: string
  uri: string
  count: number
}

interface PlaylistRecord {
  name: string
  uri: string
}

interface MemoryStore {
  songPlays: Record<string, PlayRecord>
  playlists: PlaylistRecord[]
  facts: string[]
}

let memoryStore: MemoryStore = { songPlays: {}, playlists: [], facts: [] }

// ====== Memory Persistence ======

function loadMemoryStore(): MemoryStore {
  if (fs.existsSync(MEMORY_STORE_FILE)) {
    try {
      const raw = fs.readFileSync(MEMORY_STORE_FILE, 'utf-8')
      return JSON.parse(raw) as MemoryStore
    } catch (e) {
      console.error('Failed to parse memory_store.json, migrating...', e)
    }
  }

  if (fs.existsSync(MEMORY_BOX_FILE)) {
    try {
      const raw = fs.readFileSync(MEMORY_BOX_FILE, 'utf-8')
      const oldBox: string[] = JSON.parse(raw)
      const store: MemoryStore = { songPlays: {}, playlists: [], facts: [] }

      for (const entry of oldBox) {
        const songMatch = entry.match(/User played music: "(.*)" by (.*) \(Spotify URI: (spotify:track:\w+)\)/)
        if (songMatch) {
          const [, name, artist, uri] = songMatch
          if (!store.songPlays[uri]) {
            store.songPlays[uri] = { name, artist, uri, count: 1 }
          } else {
            store.songPlays[uri].count++
          }
        } else {
          store.facts.push(entry)
        }
      }

      fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(store, null, 2))
      try { fs.unlinkSync(MEMORY_BOX_FILE) } catch {}
      return store
    } catch (e) {
      console.error('Failed to migrate memory_box.json', e)
    }
  }

  return { songPlays: {}, playlists: [], facts: [] }
}

function saveMemoryStore() {
  try {
    console.log('[Memory] Saving to:', MEMORY_STORE_FILE);
    fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(memoryStore, null, 2))
  } catch (e) {
    console.error('[Memory] Failed to save:', MEMORY_STORE_FILE, e)
  }
}

// ====== Prompt Formatting ======

function formatMemoryForPrompt(): string {
  const lines: string[] = []

  const facts = memoryStore.facts.filter(f => !f.startsWith('User is currently looking at:'))
  const activeWindow = memoryStore.facts.find(f => f.startsWith('User is currently looking at:'))
  if (facts.length > 0) {
    lines.push('=== FACTS ABOUT THE USER ===')
    for (const f of facts) lines.push('- ' + f)
    lines.push('')
  }
  if (activeWindow) {
    lines.push('=== WHAT THE USER IS DOING RIGHT NOW ===')
    lines.push('- ' + activeWindow)
    lines.push('')
  }

  const songs = Object.values(memoryStore.songPlays)
  if (songs.length > 0) {
    lines.push('=== SONGS THE USER HAS PLAYED ===')
    const sorted = [...songs].sort((a, b) => b.count - a.count)
    for (const s of sorted) {
      const suffix = s.count > 1 ? 'times' : 'time'
      lines.push('- "' + s.name + '" by ' + s.artist + ' \u2014 played ' + s.count + ' ' + suffix + ' (URI: ' + s.uri + ')')
    }
    lines.push('')
  }

  if (memoryStore.playlists.length > 0) {
    lines.push('=== SAVED PLAYLISTS ===')
    for (const p of memoryStore.playlists) {
      lines.push('- ' + p.name + ' (URI: ' + p.uri + ')')
    }
    lines.push('')
  }

  return lines.join('\n') || 'Nothing remembered yet.'
}

// ====== System Prompt ======

const SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.
You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.

Here is everything you remember about the user:

{MEMORY_BOX}

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

Do not include extra brackets except for the tool call. If the user asks what you remember or about their listening habits, check the memory sections above.`

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

let memory: Message[] = []

function loadMemory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8')
      memory = JSON.parse(data)
    }
    memoryStore = loadMemoryStore()
  } catch (e) {
    console.error('Failed to load memory', e)
  }
}

function saveMemory() {
  try {
    if (memory.length > MAX_MEMORY) {
      memory = memory.slice(memory.length - MAX_MEMORY)
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(memory))
    saveMemoryStore()
  } catch (e) {
    console.error('Failed to save memory', e)
  }
}

import { playSpotifyQuery, playSpotifyUri, startSpotifyPoller, isSpotifyPlaying } from './spotifyService.js'
import { getActiveWindowTitle } from './activeWindow.js'

let lastActiveWindow = ''

export function startAiService(win: BrowserWindow) {
  loadMemory()
  
  // Diagnostic: test if main process can reach Ollama
  var req = http.request({ hostname: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET' }, function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      try {
        var d = JSON.parse(data);
        var names = (d.models || []).map(function(m) { return m.name; }).join(', ');
        console.log('[Diagnostic] Ollama reachable, models:', names);
      } catch(e) { console.error('[Diagnostic] Parse error:', e.message); }
    });
  });
  req.on('error', function(e) { console.error('[Diagnostic] Ollama unreachable:', e.message); });
  req.end();

  const triggerSpontaneousComment = async (systemPrompt: string) => {
    console.log('[Spontaneous] Calling Ollama with:', systemPrompt.substring(0, 80) + '...');
    try {
      const postData = JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'system', content: systemPrompt }],
        stream: false
      });
      console.log('[Spontaneous] POST body size:', postData.length);
      const result = await new Promise<string>(function(resolve, reject) {
        var req = http.request({
          hostname: '127.0.0.1',
          port: 11434,
          path: '/api/chat',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, function(res) {
          var body = '';
          res.on('data', function(chunk) { body += chunk; });
          res.on('end', function() { resolve(body); });
          res.on('error', function(e) { reject(e); });
        });
        req.on('error', function(e) { reject(e); });
        var timer = setTimeout(function() {
          console.log('[Spontaneous] Request timed out, destroying');
          req.destroy();
          reject(new Error('Timeout'));
        }, 25000);
        req.on('response', function() {
          console.log('[Spontaneous] Got response headers, clearing timeout');
          clearTimeout(timer);
        });
        req.write(postData);
        req.end();
      });
      console.log('[Spontaneous] Got response, parsing...');
      const parsed = JSON.parse(result);
      if (parsed.message && parsed.message.content) {
        console.log('[Spontaneous] Ollama replied, sending to renderer:', parsed.message.content.substring(0, 60));
        win.webContents.send('proactive-message', parsed.message.content);
      } else {
        console.error('[Spontaneous] Unexpected Ollama response:', result.substring(0, 200));
      }
    } catch (e) {
      console.error('Failed spontaneous reaction', e)
    }
  }

  setInterval(async () => {
    const activeWindow = await getActiveWindowTitle()
    if (activeWindow && activeWindow !== lastActiveWindow && !activeWindow.includes('My-Buddy') && !activeWindow.includes('Taskbar')) {
      lastActiveWindow = activeWindow

      memoryStore.facts = memoryStore.facts.filter(f => !f.startsWith('User is currently looking at:'))
      memoryStore.facts.push('User is currently looking at: ' + activeWindow)
      saveMemoryStore()

      if (Math.random() < 0.3) {
        triggerSpontaneousComment('You are Zi Feng\'s Desktop Companion. He just opened an app called "' + activeWindow + '". Give a very short, 1-sentence spontaneous reaction or comment about it.')
      }
    }
  }, 15000)

  startSpotifyPoller(win, triggerSpontaneousComment, function(name, artist, trackId) {
    console.log('[Memory] Poller detected song:', name, 'by', artist);
    incrementSongPlay(name, artist, 'spotify:track:' + trackId);
  })

  // ====== Playlist Suggestion (chance-based) ======
  let lastPlaylistSuggestionTime = 0;
  setInterval(async () => {
    if (isSpotifyPlaying()) return;
    if (Math.random() >= 0.07) return;
    const now = Date.now();
    if (now - lastPlaylistSuggestionTime < 12 * 60 * 1000) return;
    lastPlaylistSuggestionTime = now;

    const playlists = memoryStore.playlists;
    let ctx = '';
    if (playlists.length > 0) {
      ctx = 'Here are his saved playlists:\n' + playlists.map(function(p) { return '- ' + p.name + ' (' + p.uri + ')'; }).join('\n');
    }
    triggerSpontaneousComment("You are Zi Feng's Desktop Companion. He is not currently listening to music or playing anything on Spotify. Suggest if he would like to play one of his favorite playlists. " + ctx + ' Keep it short, 1 sentence, casual and cute. Mention a specific playlist name if you know one.');
  }, 4 * 60 * 1000);

  // ====== IPC Handlers ======

  ipcMain.handle('send-to-ollama', async (_event, prompt: string) => {
    memory.push({ role: 'user', content: prompt })

    const response = await generateOllamaChat()

    const spotifyMatch = response.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i)
    const spotifyUriMatch = response.match(/\[?TOOL:SPOTIFY_URI:([^\]\n]+)\]?/i)
    const rememberMatch = response.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i)
    const savePlaylistMatch = response.match(/\[?TOOL:SAVE_PLAYLIST:([^\]\n|]+)\|([^\]\n]+)\]?/i)

    let finalResponse = response

    if (spotifyUriMatch) {
      const uri = spotifyUriMatch[1].trim()
      finalResponse = finalResponse.replace(spotifyUriMatch[0], '').trim()
      if (!finalResponse) finalResponse = 'Playing from memory!'

      playSpotifyUri(uri, win).then(playedMetadata => {
        if (playedMetadata && playedMetadata.uri.includes(':track:')) {
          incrementSongPlay(playedMetadata.name, playedMetadata.artist, playedMetadata.uri)
        }
      }).catch(console.error)

      memory.push({ role: 'system', content: 'System action executed: Playing Spotify URI ' + uri })
    }

    if (spotifyMatch) {
      const query = spotifyMatch[1].trim()
      finalResponse = finalResponse.replace(spotifyMatch[0], '').trim()
      if (!finalResponse) finalResponse = 'Playing ' + query + ' on Spotify!'

      playSpotifyQuery(query, win).then(playedMetadata => {
        if (playedMetadata) {
          incrementSongPlay(playedMetadata.name, playedMetadata.artist, playedMetadata.uri)
        }
      }).catch(console.error)

      memory.push({ role: 'system', content: 'System action executed: Searching and playing Spotify for ' + query })
    }

    if (rememberMatch) {
      const fact = rememberMatch[1].trim()
      finalResponse = finalResponse.replace(rememberMatch[0], '').trim()
      if (!finalResponse) finalResponse = 'Got it, I\'ll remember that!'
      if (!memoryStore.facts.includes(fact)) {
        memoryStore.facts.push(fact)
        saveMemoryStore()
      }
      memory.push({ role: 'system', content: 'System action executed: Saved "' + fact + '" to long term memory.' })
    }

    if (savePlaylistMatch) {
      const name = savePlaylistMatch[1].trim()
      let uri = savePlaylistMatch[2].trim()

      const urlMatch = uri.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/)
      if (urlMatch) {
        const type = urlMatch[1]
        const id = urlMatch[2]
        uri = 'spotify:' + type + ':' + id
      }

      finalResponse = finalResponse.replace(savePlaylistMatch[0], '').trim()
      if (!finalResponse) finalResponse = 'Saved the playlist "' + name + '"!'

      memoryStore.playlists = memoryStore.playlists.filter(p => p.uri !== uri)
      memoryStore.playlists.push({ name, uri })
      saveMemoryStore()

      memory.push({ role: 'system', content: 'System action executed: Saved playlist "' + name + '" (' + uri + ') to memory.' })
    }

    memory.push({ role: 'assistant', content: finalResponse })
    saveMemory()

    return finalResponse
  })

  ipcMain.on('add-manual-memory', (_event, manualMemory: string) => {
    if (manualMemory.trim() !== '') {
      memoryStore.facts.push(manualMemory.trim())
      saveMemoryStore()
    }
  })

  ipcMain.handle('get-memory-store', async () => {
    return JSON.parse(JSON.stringify(memoryStore))
  })

  ipcMain.handle('save-playlist-memory', async (_event, name: string, uri: string) => {
    memoryStore.playlists = memoryStore.playlists.filter(p => p.uri !== uri)
    memoryStore.playlists.push({ name, uri })
    saveMemoryStore()
    return true
  })

  ipcMain.handle('clear-song-count', async (_event, uri: string) => {
    if (memoryStore.songPlays[uri]) {
      delete memoryStore.songPlays[uri]
      saveMemoryStore()
    }
    return true
  })
}

function incrementSongPlay(name: string, artist: string, uri: string) {
  console.log('[Memory] incrementSongPlay:', name, 'by', artist, 'uri:', uri);
  if (memoryStore.songPlays[uri]) {
    memoryStore.songPlays[uri].count++
    memoryStore.songPlays[uri].name = name
    memoryStore.songPlays[uri].artist = artist
  } else {
    memoryStore.songPlays[uri] = { name, artist, uri, count: 1 }
  }
  saveMemoryStore()
}

async function generateOllamaChat(): Promise<string> {
  try {
    const memoryFacts = formatMemoryForPrompt()
    const currentPrompt = SYSTEM_PROMPT.replace('{MEMORY_BOX}', memoryFacts)

    const messages = [
      { role: 'system', content: currentPrompt },
      ...memory
    ]

    const res = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        stream: false
      })
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error('HTTP error! status: ' + res.status + ', body: ' + errText)
    }

    const data: any = await res.json()
    return data.message.content
  } catch (error: any) {
    console.error('[Ollama API] Error:', error.message)
    if (error.message.includes('404')) {
      return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it."
    }
    return 'Connection to local AI failed. Is Ollama running?'
  }
}
