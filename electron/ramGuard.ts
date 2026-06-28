import { BrowserWindow } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const TARGET_GAMES = ['VALORANT.exe', 'Minecraft.exe', 'javaw.exe']
const OLLAMA_API = 'http://localhost:11434/api/generate'
const MODEL_NAME = 'llama3' // Hardcoded for now, can be configurable

let isSleeping = false

export function startRamGuard(win: BrowserWindow) {
  // Check every 10 seconds
  setInterval(async () => {
    try {
      const { stdout } = await execAsync('tasklist')
      
      const gameDetected = TARGET_GAMES.some(game => 
        stdout.toLowerCase().includes(game.toLowerCase())
      )

      if (gameDetected && !isSleeping) {
        // Unload Ollama
        console.log('[RAM Guard] Game detected. Unloading Ollama model...')
        await fetch(OLLAMA_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: MODEL_NAME, keep_alive: 0 })
        }).catch(err => console.error('[RAM Guard] Failed to unload Ollama:', err))
        
        isSleeping = true
        win.webContents.send('ram-guard-status', 'sleeping')
      } else if (!gameDetected && isSleeping) {
        // Re-initialize or just wake up UI (Ollama loads automatically on next prompt)
        console.log('[RAM Guard] Game closed. AI is active.')
        isSleeping = false
        win.webContents.send('ram-guard-status', 'active')
      }

    } catch (error) {
      console.error('[RAM Guard] Error checking processes:', error)
    }
  }, 10000)
}
