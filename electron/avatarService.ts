import { app, dialog, BrowserWindow } from 'electron'
import { join, extname } from 'node:path'
import { promises as fs } from 'node:fs'

const USER_DATA_PATH = app.getPath('userData')
const AVATAR_DIR = join(USER_DATA_PATH, 'avatars')
const CONFIG_PATH = join(USER_DATA_PATH, 'avatar-config.json')

export type AvatarConfig = Record<string, string>

// Initialize avatars directory
async function initDir() {
  try {
    await fs.mkdir(AVATAR_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create avatars directory:', err)
  }
}

initDir()

export async function getAvatarConfig(): Promise<AvatarConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    // If file doesn't exist or is invalid, return empty config
    return {}
  }
}

async function saveAvatarConfig(config: AvatarConfig) {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('Failed to save avatar config:', err)
  }
}

export async function selectAndCopyAvatarImage(window: BrowserWindow, state: string): Promise<AvatarConfig | null> {
  const result = await dialog.showOpenDialog(window, {
    title: `Select Avatar Image for ${state}`,
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const sourcePath = result.filePaths[0]
  const ext = extname(sourcePath)
  // Use timestamp to force UI refresh when image path changes
  const destFilename = `${state}_${Date.now()}${ext}`
  const destPath = join(AVATAR_DIR, destFilename)

  try {
    await fs.copyFile(sourcePath, destPath)
    
    // Update config
    const config = await getAvatarConfig()
    // Clean up old file if it exists
    if (config[state]) {
      try {
        await fs.unlink(config[state])
      } catch (e) {
        // Ignore errors deleting old file
      }
    }
    
    config[state] = destPath
    await saveAvatarConfig(config)
    
    return config
  } catch (err) {
    console.error(`Failed to copy avatar image for ${state}:`, err)
    return null
  }
}

export async function resetAvatarImage(state: string): Promise<AvatarConfig> {
  const config = await getAvatarConfig()
  if (config[state]) {
    try {
      await fs.unlink(config[state])
    } catch (e) {
      // Ignore
    }
    delete config[state]
    await saveAvatarConfig(config)
  }
  return config
}

export async function saveGeneratedAvatarSet(images: Record<string, string>): Promise<AvatarConfig> {
  const config = await getAvatarConfig()
  
  for (const [state, base64Str] of Object.entries(images)) {
    // Remove the data:image/png;base64, prefix
    const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const destFilename = `${state}_${Date.now()}.png`
    const destPath = join(AVATAR_DIR, destFilename)
    
    try {
      await fs.writeFile(destPath, buffer)
      
      // Clean up old file if it exists
      if (config[state]) {
        try {
          await fs.unlink(config[state])
        } catch (e) {
          // Ignore
        }
      }
      
      config[state] = destPath
    } catch (err) {
      console.error(`Failed to save generated avatar image for ${state}:`, err)
    }
  }
  
  await saveAvatarConfig(config)
  return config
}
