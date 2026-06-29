import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HISTORY_FILE = join(__dirname, '../../chat_history.json')
const MEMORY_BOX_FILE = join(__dirname, '../../memory_box.json')
const OLLAMA_API = 'http://localhost:11434/api/chat'
const MODEL_NAME = 'llama3'
const MAX_MEMORY = 50

let memoryBox: string[] = []

const SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.
You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.

Here are the facts you remember about the user:
{MEMORY_BOX}

If the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and end your response EXACTLY with the text: [TOOL:SPOTIFY:query].
IMPORTANT: Make the query extremely accurate for Spotify's search engine. If the user's request matches a Spotify URI from your memory, use the exact URI as the query (e.g. [TOOL:SPOTIFY:spotify:track:12345]). Otherwise, if it's a playlist, INCLUDE the word 'playlist'. If it's a specific song by an artist, put the song name and artist name (e.g. [TOOL:SPOTIFY:double take dhruv]).
If the user tells you to remember something about them or their preferences, you must save it by ending your response EXACTLY with the text: [TOOL:REMEMBER:fact].
For example: [TOOL:REMEMBER:User's favorite color is blue].
Do not include brackets except for the tool call.`

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
    if (fs.existsSync(MEMORY_BOX_FILE)) {
      const data = fs.readFileSync(MEMORY_BOX_FILE, 'utf-8')
      memoryBox = JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load memory', e)
  }
}

function saveMemory() {
  try {
    // Keep last MAX_MEMORY items
    if (memory.length > MAX_MEMORY) {
      memory = memory.slice(memory.length - MAX_MEMORY)
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(memory))
    fs.writeFileSync(MEMORY_BOX_FILE, JSON.stringify(memoryBox))
  } catch (e) {
    console.error('Failed to save memory', e)
  }
}

import { playSpotifyQuery, startSpotifyPoller } from './spotifyService.js'
import { getActiveWindowTitle } from './activeWindow.js'

let lastActiveWindow = ''

export function startAiService(win: BrowserWindow) {
  loadMemory()

  const triggerSpontaneousComment = async (systemPrompt: string) => {
    try {
      const res = await fetch(OLLAMA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'system', content: systemPrompt }],
          stream: false
        })
      })
      if (res.ok) {
        const data: any = await res.json()
        win.webContents.send('proactive-message', data.message.content)
      }
    } catch (e) {
      console.error('Failed spontaneous reaction', e)
    }
  }

  // Poll active window every 15 seconds
  setInterval(async () => {
    const activeWindow = await getActiveWindowTitle()
    if (activeWindow && activeWindow !== lastActiveWindow && !activeWindow.includes('My-Buddy') && !activeWindow.includes('Taskbar')) {
      lastActiveWindow = activeWindow
      
      memoryBox = memoryBox.filter(m => !m.startsWith('User is currently looking at:'))
      memoryBox.push(`User is currently looking at: ${activeWindow}`)

      if (Math.random() < 0.3) {
        triggerSpontaneousComment(`You are Zi Feng's Desktop Companion. He just opened an app called "${activeWindow}". Give a very short, 1-sentence spontaneous reaction or comment about it.`)
      }
    }
  }, 15000)

  // Start Spotify poller
  startSpotifyPoller(win, triggerSpontaneousComment)

  ipcMain.handle('send-to-ollama', async (_event, prompt: string) => {
    memory.push({ role: 'user', content: prompt })
    
    const response = await generateOllamaChat()
    
    // Use negated character class to capture the query correctly even if brackets are missing
    const spotifyMatch = response.match(/\[?TOOL:SPOTIFY:([^\]\n]+)\]?/i)
    const rememberMatch = response.match(/\[?TOOL:REMEMBER:([^\]\n]+)\]?/i)
    let finalResponse = response
    
    if (spotifyMatch) {
      const query = spotifyMatch[1].trim()
      finalResponse = finalResponse.replace(spotifyMatch[0], '').trim()
      if (!finalResponse) finalResponse = `Playing ${query} on Spotify!`
      
      // Fire and forget, but handle memory addition inside
      playSpotifyQuery(query, win).then(playedMetadata => {
        if (playedMetadata) {
          const fact = `User played music: "${playedMetadata.name}" by ${playedMetadata.artist} (Spotify URI: ${playedMetadata.uri})`;
          // Avoid duplicate identical facts
          if (!memoryBox.includes(fact)) {
            memoryBox.push(fact);
            saveMemory();
          }
        }
      }).catch(console.error);
      
      memory.push({ role: 'system', content: `System action executed: Searching and playing Spotify for ${query}` })
    }

    if (rememberMatch) {
      const fact = rememberMatch[1].trim()
      finalResponse = finalResponse.replace(rememberMatch[0], '').trim()
      if (!finalResponse) finalResponse = `Got it, I'll remember that!`
      if (!memoryBox.includes(fact)) {
        memoryBox.push(fact)
        saveMemory()
      }
      memory.push({ role: 'system', content: `System action executed: Saved "${fact}" to long term memory.` })
    }

    // Add assistant message to memory
    memory.push({ role: 'assistant', content: finalResponse })
    saveMemory()

    return finalResponse
  })

  ipcMain.on('add-manual-memory', (_event, manualMemory: string) => {
    if (manualMemory.trim() !== '') {
      memoryBox.push(manualMemory.trim())
      saveMemory()
    }
  })
}

async function generateOllamaChat(): Promise<string> {
  try {
    const memoryFacts = memoryBox.length > 0 ? memoryBox.map(m => '- ' + m).join('\\n') : 'No facts remembered yet.'
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
        throw new Error(`HTTP error! status: ${res.status}, body: ${errText}`)
    }

    const data: any = await res.json()
    return data.message.content
  } catch (error: any) {
    console.error('[Ollama API] Error:', error.message)
    if (error.message.includes('404')) {
      return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it."
    }
    return "Connection to local AI failed. Is Ollama running?"
  }
}
