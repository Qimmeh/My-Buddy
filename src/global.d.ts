export {}

declare global {
  interface Window {
    electronAPI: {
      onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => void
      onProactiveMessage: (callback: (message: string) => void) => void
      onAiStateChange: (callback: (state: string) => void) => void
      sendToOllama: (prompt: string) => Promise<string>
      addManualMemory: (memory: string) => void
      saveSpotifyConfig: (id: string, secret: string) => void
      getSpotifyConfig: () => Promise<{clientId: string, clientSecret: string}>
      authenticateSpotify: () => void
      resizeWindow: (mode: 'avatar' | 'full') => void
      dragWindow: (dx: number, dy: number) => void
      endDrag: (vx: number, vy: number, wasDragged?: boolean) => void
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void
      quitApp: () => void
    }
  }
}
