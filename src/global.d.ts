export {}

declare global {
  interface Window {
    electronAPI: {
      onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => void
      onProactiveMessage: (callback: (message: string) => void) => void
      onAiStateChange: (callback: (state: 1 | 2 | 3 | 4) => void) => void
      sendToOllama: (prompt: string) => Promise<string>
      addManualMemory: (memory: string) => void
      saveSpotifyConfig: (id: string, secret: string) => void
      getSpotifyConfig: () => Promise<{clientId: string, clientSecret: string}>
      authenticateSpotify: () => void
      setIgnoreMouseEvents: (ignore: boolean) => void
      quitApp: () => void
    }
  }
}
