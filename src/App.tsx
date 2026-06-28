import { useState, useEffect } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { BuddyAvatar } from './components/BuddyAvatar'
import './index.css'

function App() {
  const [status, setStatus] = useState<'active' | 'sleeping'>('active')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Listen for RAM Guard status changes
    window.electronAPI.onRamGuardStatus((newStatus) => {
      setStatus(newStatus)
      if (newStatus === 'sleeping') {
        setMessage('Entering low-power mode. Games detected.')
      } else {
        setMessage('I am back online.')
      }
    })

    // Listen for proactive messages from Reactivity Engine
    window.electronAPI.onProactiveMessage((msg) => {
      setMessage(msg)
    })
  }, [])

  return (
    <div style={styles.appContainer}>
      {/* Draggable region for transparent window (optional) */}
      <div style={styles.dragRegion} />

      <BuddyAvatar status={status} message={message} />
      
      <CommandPalette 
        status={status} 
        onResponse={(res) => setMessage(res)} 
      />
    </div>
  )
}

const styles = {
  appContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dragRegion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40px',
    // webkitAppRegion: 'drag' is valid in Electron, but TypeScript React types might complain
    WebkitAppRegion: 'drag',
    zIndex: 10,
  }
} as const

export default App
