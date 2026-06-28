import { BrowserWindow, powerMonitor, ipcMain } from 'electron'

const IDLE_THRESHOLD_SECONDS = 10 * 60 // 10 minutes
const OLLAMA_API = 'http://localhost:11434/api/generate'
const MODEL_NAME = 'llama3'

const SYSTEM_PROMPT = `You are Zi Feng's Desktop Companion. You are a sleek, minimalist AI. You are reactive—if the user has been idle, suggest music or ask about their current coding progress. You know about their 'DuitFlow' project and their schedule. Be helpful, slightly witty, and tech-savvy. You operate in a 'Command Portal' mode.`

let hasTriggeredIdle = false

export function startReactivityEngine(win: BrowserWindow) {
  // Check every 10 seconds
  setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime()

    if (idleTime >= IDLE_THRESHOLD_SECONDS && !hasTriggeredIdle) {
      hasTriggeredIdle = true
      triggerProactiveMessage(win)
    } else if (idleTime < IDLE_THRESHOLD_SECONDS && hasTriggeredIdle) {
      // Reset when user becomes active again
      hasTriggeredIdle = false
    }
  }, 10000)

  // Listen for user prompts from renderer
  ipcMain.handle('send-to-ollama', async (_event, prompt: string) => {
    return await generateOllamaResponse(prompt)
  })
}

async function triggerProactiveMessage(win: BrowserWindow) {
  try {
    const prompt = `The user has been idle for a while. Proactively engage them. Keep it short (1-2 sentences).`
    const response = await generateOllamaResponse(prompt)
    if (response) {
      win.webContents.send('proactive-message', response)
    }
  } catch (error) {
    console.error('[Reactivity Engine] Failed to get proactive message:', error)
  }
}

async function generateOllamaResponse(prompt: string): Promise<string> {
  try {
    const res = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        stream: false
      })
    })
    
    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP error! status: ${res.status}, body: ${errText}`)
    }

    const data: any = await res.json()
    return data.response
  } catch (error: any) {
    console.error('[Ollama API] Error:', error.message)
    if (error.message.includes('404')) {
      return "Error: Ollama model 'llama3' not found. Please run `ollama run llama3` in your terminal to download it."
    }
    return "Connection to local AI failed. Is Ollama running?"
  }
}
