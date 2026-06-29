import { app } from 'electron'
import { join, extname } from 'node:path'
import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'

const USER_DATA_PATH = app.getPath('userData')
const BUNDLES_DIR = join(USER_DATA_PATH, 'bundles')
const MARKETPLACE_INDEX = join(BUNDLES_DIR, 'marketplace.json')

export interface BundleManifest {
  id: string
  name: string
  author: string
  version: string
  description: string
  images: Record<string, string>  // state -> filename
  hash: string
  thumbnailState: string
}

export interface AvatarConfig {
  [state: string]: string  // state -> file path
}

async function initDir() {
  try { await fs.mkdir(BUNDLES_DIR, { recursive: true }) } catch { await fs.mkdir(BUNDLES_DIR, { recursive: true }) }
}

initDir()

function generateId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
}

async function computeHash(config: AvatarConfig): Promise<string> {
  const hash = createHash('sha256')
  const sortedStates = Object.keys(config).sort()
  for (const state of sortedStates) {
    try {
      const buf = await fs.readFile(config[state])
      hash.update(buf)
    } catch {}
  }
  return hash.digest('hex')
}

export async function createBundle(name: string, author: string, description: string, config: AvatarConfig): Promise<BundleManifest> {
  const id = generateId(name)
  const bundleDir = join(BUNDLES_DIR, id)
  await fs.mkdir(bundleDir, { recursive: true })

  const images: Record<string, string> = {}
  const stateOrder = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy', 'blink', 'glance-left', 'glance-right', 'look-around']

  for (const state of stateOrder) {
    if (config[state]) {
      const ext = extname(config[state]) || '.png'
      const filename = state + ext
      try {
        await fs.copyFile(config[state], join(bundleDir, filename))
        images[state] = filename
      } catch {}
    }
  }

  // Use first available image as thumbnail
  const thumbnailState = Object.keys(images)[0] || 'idle'

  const hash = await computeHash(config)

  // Check for existing bundle with same hash
  const existingBundles = await listBundles()
  for (const bundle of existingBundles) {
    if (bundle.hash === hash) {
      throw new Error('DUPLICATE_BUNDLE: This exact avatar set is already bundled as "' + bundle.name + '"')
    }
  }

  const manifest: BundleManifest = { id, name, author, version: '1.0.0', description, images, hash, thumbnailState }
  await fs.writeFile(join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // Update marketplace index
  const marketplace = await loadMarketplace()
  marketplace.push({ id, name, author, version: '1.0.0', description, hash, thumbnailState })
  marketplace.sort((a, b) => a.name.localeCompare(b.name))
  await fs.writeFile(MARKETPLACE_INDEX, JSON.stringify(marketplace, null, 2))

  return manifest
}

export async function installBundle(bundleId: string, targetConfig: AvatarConfig): Promise<AvatarConfig> {
  const bundleDir = join(BUNDLES_DIR, bundleId)
  const manifestPath = join(bundleDir, 'manifest.json')

  try {
    const manifestData = await fs.readFile(manifestPath, 'utf-8')
    const manifest: BundleManifest = JSON.parse(manifestData)
    const newConfig: AvatarConfig = {}
    const stateOrder = Object.keys(manifest.images)

    for (const state of stateOrder) {
      const filename = manifest.images[state]
      const sourcePath = join(bundleDir, filename)
      try {
        await fs.access(sourcePath)
        // Copy to avatar dir with timestamp to trigger update
        const ext = extname(filename)
        const destFilename = state + '_' + Date.now() + ext
        const destPath = join(USER_DATA_PATH, 'avatars', destFilename)
        await fs.copyFile(sourcePath, destPath)

        // Clean up old file in target config
        if (newConfig[state]) {
          try { await fs.unlink(newConfig[state]) } catch {}
        }
        newConfig[state] = destPath
      } catch {}
    }

    // Store bundle metadata in config
    newConfig['_bundleId'] = bundleId
    newConfig['_bundleHash'] = manifest.hash

    return newConfig
  } catch (err) {
    throw new Error('Bundle not found: ' + bundleId)
  }
}

export async function listBundles(): Promise<BundleManifest[]> {
  const marketplace = await loadMarketplace()
  const bundles: BundleManifest[] = []

  for (const entry of marketplace) {
    try {
      const manifestPath = join(BUNDLES_DIR, entry.id, 'manifest.json')
      const data = await fs.readFile(manifestPath, 'utf-8')
      bundles.push(JSON.parse(data))
    } catch {}
  }
  return bundles
}

async function loadMarketplace(): Promise<any[]> {
  try {
    const data = await fs.readFile(MARKETPLACE_INDEX, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function canUploadBundle(config: AvatarConfig): Promise<{ canUpload: boolean; existingName?: string }> {
  const hash = await computeHash(config)
  const bundles = await listBundles()
  for (const bundle of bundles) {
    if (bundle.hash === hash) {
      return { canUpload: false, existingName: bundle.name }
    }
  }
  return { canUpload: true }
}

export async function getBundleThumbnail(bundleId: string): Promise<string | null> {
  try {
    const manifestPath = join(BUNDLES_DIR, bundleId, 'manifest.json')
    const data = await fs.readFile(manifestPath, 'utf-8')
    const manifest: BundleManifest = JSON.parse(data)
    const thumbFile = manifest.images[manifest.thumbnailState]
    if (thumbFile) {
      return join(BUNDLES_DIR, bundleId, thumbFile)
    }
    return null
  } catch { return null }
}

export async function getEquippedBundle(config: AvatarConfig): Promise<{ bundleId: string; hash: string } | null> {
  if (config['_bundleId'] && config['_bundleHash']) {
    return { bundleId: config['_bundleId'], hash: config['_bundleHash'] }
  }
  return null
}