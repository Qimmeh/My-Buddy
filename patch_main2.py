import os

path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the line after "  return null\n})" (the end of save-generated-avatar-set)
old = "  return null\n})\n"
insert = """  return null
})

// Marketplace IPCs
ipcMain.handle('create-bundle', async (_event, name, author, description) => {
  const config = await getAvatarConfig()
  try {
    const manifest = await createBundle(name, author, description, config)
    return { success: true, manifest }
  } catch (err) {
    return { success: false, error: (err as Error).message }
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
"""

content = content.replace(old, insert)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts updated!')