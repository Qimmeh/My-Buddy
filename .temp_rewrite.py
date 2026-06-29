import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HISTORY_FILE = join(__dirname, '../../chat_history.json')
const MEMORY_STORE_FILE = join(__dirname, '../../memory_store.json')
const MEMORY_BOX_FILE = join(__dirname, '../../memory_box.json')
const OLLAMA_API = 'http://localhost:11434/api/chat'
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
  songPlays: Record<string, PlayRecord>  // keyed by Spotify URI
  playlists: PlaylistRecord[]
  facts: string[]
}

let memoryStore: MemoryStore = { songPlays: {}, playlists: [], facts: [] }

// ====== Memory Persistence ======

function loadMemoryStore(): MemoryS