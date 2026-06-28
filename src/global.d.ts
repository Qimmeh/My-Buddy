export {}

declare global {
  interface Window {
    electronAPI: {
      onRamGuardStatus: (callback: (status: 'active' | 'sleeping') => void) => void
      onProactiveMessage: (callback: (message: string) => void) => void
      onAiStateChange: (callback: (state: 1 | 2 | 3 | 4) => void) => void
      sendToOllama: (prompt: string) => Promise<string>
      quitApp: () => void
    }
  }
}
