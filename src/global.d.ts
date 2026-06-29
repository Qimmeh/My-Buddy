export {}

declare global {
  interface Window {
    electronAPI: {
      onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => void
      onProactiveMessage: (callback: (message: string) => void) => void
      onAiStateChange: (callback: (state: string) => void) => void
      sendToOllama: (prompt: string) => Promise<string>
      addManualMemory: (memory: string) => void
      getMemoryStore: () => Promise<{
        songPlays: Record<string, { name: string; artist: string; uri: string; count: number }>,
        playlists: Array<{ name: string; uri: string }>,
        facts: string[]
      }>
      savePlaylistMemory: (name: string, uri: string) => Promise<boolean>
      clearSongCount: (uri: string) => Promise<boolean>
            saveSpotifyConfig: (id: string, secret: string) => void
      getSpotifyConfig: () => Promise<{clientId: string, clientSecret: string}>
      authenticateSpotify: () => void
      resizeWindow: (mode: 'avatar' | 'full') => void
      dragWindow: (dx: number, dy: number) => void
      endDrag: (vx: number, vy: number, wasDragged?: boolean) => void
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void
      quitApp: () => void
      getAvatarConfig: () => Promise<Record<string, string>>
      selectAvatarImage: (state: string) => Promise<Record<string, string> | null>
      resetAvatarImage: (state: string) => Promise<Record<string, string> | null>
      saveGeneratedAvatarSet: (images: Record<string, string>) => Promise<Record<string, string> | null>
      onAvatarConfigUpdated: (callback: (config: Record<string, string>) => void) => void
    }
  }
}
