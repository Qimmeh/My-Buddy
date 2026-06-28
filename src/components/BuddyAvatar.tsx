import { useEffect, useRef, useState } from 'react'

interface BuddyAvatarProps {
  status: 'active' | 'sleeping';
  message: string | null;
}

export function BuddyAvatar({ status, message }: BuddyAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Message bubble fade out effect
  useEffect(() => {
    if (message) {
      setIsVisible(true)
      const timer = setTimeout(() => setIsVisible(false), 8000) // hide after 8s
      return () => clearTimeout(timer)
    }
  }, [message])

  // Simple visualizer simulation since we don't have TTS yet
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const isSleeping = status === 'sleeping'
      const baseRadius = 40
      // Pulse if active and has a message currently visible
      const pulse = (!isSleeping && isVisible) ? Math.sin(time * 0.1) * 10 : 0
      
      const radius = baseRadius + pulse
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      
      if (isSleeping) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)'
      } else {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
        ctx.shadowBlur = 20 + pulse
        ctx.shadowColor = '#0ff'
      }
      
      ctx.lineWidth = 3
      ctx.fill()
      ctx.stroke()
      ctx.shadowBlur = 0 // reset

      // Draw inner eye/core
      ctx.beginPath()
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2)
      ctx.fillStyle = isSleeping ? '#555' : '#0ff'
      ctx.fill()

      time++
      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => cancelAnimationFrame(animationId)
  }, [status, isVisible])

  return (
    <div style={styles.container}>
      {/* Speech Bubble */}
      <div style={{
        ...styles.bubble,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
      }}>
        {message || "..."}
      </div>

      {/* Avatar Canvas */}
      <div style={styles.avatarWrapper}>
        <canvas 
          ref={canvasRef} 
          width={150} 
          height={150} 
          style={{
            filter: status === 'sleeping' ? 'grayscale(100%)' : 'none'
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    flex: 1,
    padding: '40px',
  },
  bubble: {
    backgroundColor: 'var(--dark-bg)',
    border: '1px solid var(--neon-cyan)',
    borderRadius: '15px',
    padding: '15px 25px',
    maxWidth: '80%',
    color: 'var(--text-primary)',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    textAlign: 'center',
    fontSize: '1.1rem',
    lineHeight: '1.5',
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
} as const
