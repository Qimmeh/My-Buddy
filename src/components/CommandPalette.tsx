import { useState, useRef, useEffect } from 'react'

interface CommandPaletteProps {
  onResponse: (response: string) => void;
  status: 'active' | 'sleeping';
}

export function CommandPalette({ onResponse, status }: CommandPaletteProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input automatically
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus()
    window.addEventListener('focus', focusInput)
    return () => window.removeEventListener('focus', focusInput)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status === 'sleeping') return

    const prompt = input.trim()
    setInput('')
    setIsLoading(true)
    
    // Simulate thinking text immediately
    onResponse('...')

    try {
      const response = await window.electronAPI.sendToOllama(prompt)
      onResponse(response)
    } catch (err) {
      console.error(err)
      onResponse("I'm having trouble connecting to my systems right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <span style={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={status === 'sleeping' ? 'AI is sleeping (Game Mode)...' : 'Ask me anything...'}
          style={{
            ...styles.input,
            opacity: status === 'sleeping' ? 0.5 : 1,
            pointerEvents: status === 'sleeping' ? 'none' : 'auto'
          }}
          disabled={status === 'sleeping' || isLoading}
        />
      </form>
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
    padding: '20px',
    backgroundColor: 'var(--dark-bg)',
    borderTop: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 -5px 20px rgba(0, 255, 255, 0.1)',
  },
  form: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  prompt: {
    color: 'var(--neon-cyan)',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    textShadow: '0 0 5px var(--neon-cyan)',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '1.2rem',
    outline: 'none',
    fontFamily: 'inherit',
  }
} as const
