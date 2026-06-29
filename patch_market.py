import os

path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
old = "import { getAvatarConfig, selectAndCopyAvatarImage, resetAvatarImage, saveGeneratedAvatarSet } from './avatarService.js'"
new = old + "\nimport { createBundle, installBundle, listBundles, canUploadBundle, getBundleThumbnail, getEquippedBundle } from './avatarMarketplace.js'"
content = content.replace(old, new)

# Add marketplace IPC handlers after last avatar handler
old = """ipcMain.handle('save-generated-avatar-set', async (event, images) => {
    const config = await saveGeneratedAvatarSet(images)
    w.webContents.send('avatar-config-updated', config)
    return config
  })
}"""

new = """ipcMain.handle('save-generated-avatar-set', async (event, images) => {
    const config = await saveGeneratedAvatarSet(images)
    w.webContents.send('avatar-config-updated', config)
    return config
  })
}

// Marketplace IPCs
ipcMain.handle('create-bundle', async (_event, name, author, description) => {
  const config = await getAvatarConfig()
  try {
    const manifest = await createBundle(name, author, description, config)
    return { success: true, manifest }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('install-bundle', async (_event, bundleId) => {
  const config = await getAvatarConfig()
  const newConfig = await installBundle(bundleId, config)
  const { join } = await import('node:path')
  const { promises: fs } = await import('node:fs')
  const CONFIG_PATH = join(app.getPath('userData'), 'avatar-config.json')
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2))
  return newConfig
})

ipcMain.handle('list-bundles', async () => {
  return await listBundles()
})

ipcMain.handle('can-upload-bundle', async () => {
  const config = await getAvatarConfig()
  return await canUploadBundle(config)
})

ipcMain.handle('get-bundle-thumbnail', async (_event, bundleId) => {
  return await getBundleThumbnail(bundleId)
})"""

content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts updated')