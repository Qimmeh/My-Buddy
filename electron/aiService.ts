import { BrowserWindow, ipcMain, app } from 'electron'
import { exec } from 'node:child_process'
import { join } from 'node:path'
import * as fs from 'node:fs'

const OLLAMA_API = 'http://localhost:11434/api/chat'
const MODEL_NAME = 'llama3'

const HISTORY_FILE = join(app.getPath('userData'), 'history.json')
const MEMORY_BOX_FILE = join(app.getPath('userData'), 'memory_box.json')
const MAX_MEMORY = 20

let memoryBox: string[] = []

const SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You live in his system tray as Raiden Shogun from Genshin Impact.
You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy. You have memory of past conversations.

Here are the facts you remember about the user:
{MEMORY_BOX}

If the user asks you to play music or open Spotify (especially with a specific song, artist, or playlist), you should reply briefly acknowledging it, and end your response EXACTLY with the text: [TOOL:SPOTIFY:query].
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

export function startAiService(win: BrowserWindow) {
  loadMemory()

  ipcMain.handle('send-to-ollama', async (_event, prompt: string) => {
    // Add user message to memory
    memory.push({ role: 'user', content: prompt })
    
    const response = await generateOllamaChat()
    
    // Check for tool calls
    const spotifyMatch = response.match(/\[TOOL:SPOTIFY:(.*?)\]/)
    const rememberMatch = response.match(/\[TOOL:REMEMBER:(.*?)\]/)
    let finalResponse = response
    
    if (spotifyMatch) {
      const query = spotifyMatch[1].trim()
      finalResponse = finalResponse.replace(spotifyMatch[0], '').trim()
      executeSpotifyTool(query)
      memory.push({ role: 'system', content: `System action executed: Opened Spotify searching for ${query}` })
    }

    if (rememberMatch) {
      const fact = rememberMatch[1].trim()
      finalResponse = finalResponse.replace(rememberMatch[0], '').trim()
      memoryBox.push(fact)
      memory.push({ role: 'system', content: `System action executed: Saved fact to memory box: ${fact}` })
    }

    // Add assistant message to memory
    memory.push({ role: 'assistant', content: finalResponse })
    saveMemory()

    return finalResponse
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

function executeSpotifyTool(query: string) {
  console.log(`Executing Spotify tool with query: ${query}`)
  // On Windows, 'start spotify:' opens the app.
  // We can pass a search query uri like: spotify:search:query
  const encodedQuery = encodeURIComponent(query)
  const command = `start spotify:search:${encodedQuery}`
  
  exec(command, (error) => {
    if (error) {
      console.error(`Failed to execute Spotify command: ${error.message}`)
    }
  })
}
