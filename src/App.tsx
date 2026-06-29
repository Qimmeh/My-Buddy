import { useState, useEffect, useRef } from 'react';
import { BuddyAvatar } from './components/BuddyAvatar';
import { ChatBubble } from './components/ChatBubble';
import { InputTray } from './components/InputTray';
import { SettingsMenu } from './components/SettingsMenu';
import './index.css';

function App() {
  const [state, setState] = useState<'idle' | 'active' | 'ready' | 'thinking' | 'walking-left' | 'walking-right' | 'paused' | 'dizzy' | 'blink' | 'glance-left' | 'glance-right' | 'look-around'>('ready');
  const [chatVisible, setChatVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lastMessage, setLastMessage] = useState("Hello! I'm here.");
  const [isBouncing, setIsBouncing] = useState(false);
  const animationLock = useRef<string | null>(null);

  // Alt+Click to navigate buddy to a point
  useEffect(() => {
    const handleAltClick = (e: MouseEvent) => {
      if (e.altKey && window.electronAPI.navigateToPoint) {
        window.electronAPI.navigateToPoint(e.screenX, e.screenY);
      }
    };
    window.addEventListener('click', handleAltClick);
    return () => window.removeEventListener('click', handleAltClick);
  }, []);

  // Listen for micro-actions (blink, glance, bounce, etc.)
  useEffect(() => {
    if (window.electronAPI.onMicroAction) {
      window.electronAPI.onMicroAction((action) => {
        if (action === 'bounce') {
          setIsBouncing(true);
          setTimeout(() => setIsBouncing(false), 500);
          return;
        }
        // Lock physics loop from overriding during micro-animation
        if (action === 'blink') {
          setState('blink');
          animationLock.current = 'blink';
          setTimeout(() => {
            animationLock.current = null;
            setState('idle');
          }, 200);
        } else if (action === 'glance-left') {
          setState('glance-left');
          animationLock.current = 'glance-left';
          setTimeout(() => {
            animationLock.current = null;
            setState('idle');
          }, 400);
        } else if (action === 'glance-right') {
          setState('glance-right');
          animationLock.current = 'glance-right';
          setTimeout(() => {
            animationLock.current = null;
            setState('idle');
          }, 400);
        } else if (action === 'look-around') {
          setState('look-around');
          animationLock.current = 'look-around';
          setTimeout(() => {
            setState('glance-left');
            animationLock.current = 'look-around';
            setTimeout(() => {
              animationLock.current = null;
              setState('idle');
            }, 400);
          }, 300);
        }
      });
    }
  }, []);

  useEffect(() => {
    // Listen for AI state changes from main process if implemented
    if (window.electronAPI.onAiStateChange) {
      window.electronAPI.onAiStateChange((newState: string) => {
        // Don't override micro-animations
        if (!animationLock.current) {
          setState(newState as any);
        }
      });
    }

    if (window.electronAPI.onProactiveMessage) {
      window.electronAPI.onProactiveMessage((msg) => { console.log('[Renderer] Got proactive message:', msg);
        setLastMessage(msg);
        setChatVisible(true);
        // Trigger bounce
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500);
      });
    }

    // Ping Ollama on startup to check connection if needed
    // Assuming 'ready' is successful connection
    setState('ready');
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    
    // Auto-hide after 5 seconds if chat is visible, input is NOT visible, not thinking, and settings closed
    if (chatVisible && !inputVisible && state !== 'thinking' && !settingsVisible) {
      timeoutId = setTimeout(() => {
        setChatVisible(false);
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chatVisible, inputVisible, state, settingsVisible]);

  useEffect(() => {
    const handleBlur = () => {
      setSettingsVisible(false);
      setInputVisible(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    if (window.electronAPI.resizeWindow) {
      if (chatVisible || settingsVisible || inputVisible) {
        window.electronAPI.resizeWindow('full');
      } else {
        window.electronAPI.resizeWindow('avatar');
      }
    }
  }, [chatVisible, settingsVisible, inputVisible]);


  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startY: 0, isDragged: false, lastX: 0, lastY: 0, lastTime: 0, vx: 0, vy: 0, petTimer: null as any });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId);
    }
    // Start pet timer (cancelled if moved more than 5px)
    const petTimerId = setTimeout(() => {
      if (!dragInfo.current.isDragged) {
        setIsBouncing(true);
        setState('active');
        setTimeout(() => {
          setIsBouncing(false);
          setState('idle');
        }, 600);
      }
    }, 400);
    dragInfo.current = {
      startX: e.screenX, 
      startY: e.screenY, 
      isDragged: false,
      petTimer: petTimerId,
      lastX: e.screenX,
      lastY: e.screenY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.screenX - dragInfo.current.lastX;
      const dy = e.screenY - dragInfo.current.lastY;
      
      if (Math.abs(e.screenX - dragInfo.current.startX) > 5 || Math.abs(e.screenY - dragInfo.current.startY) > 5) {
        dragInfo.current.isDragged = true;
      }
      
      const now = performance.now();
      const dt = now - dragInfo.current.lastTime;
      if (dt > 0) {
        // Convert to pixels per frame (assuming ~60fps, 16.6ms per frame)
        dragInfo.current.vx = (dx / dt) * 16.6;
        dragInfo.current.vy = (dy / dt) * 16.6;
      }

      dragInfo.current.lastX = e.screenX;
      dragInfo.current.lastY = e.screenY;
      dragInfo.current.lastTime = now;
      
      if (window.electronAPI.dragWindow) {
        window.electronAPI.dragWindow(dx, dy);
      }
    }
  };

  const handlePointerUp = (_e: React.PointerEvent) => {
    setIsDragging(false);
    if (dragInfo.current.petTimer) clearTimeout(dragInfo.current.petTimer);
    if (window.electronAPI.endDrag) {
      if (dragInfo.current.isDragged) {
        // Clamp velocity so she doesn't break the sound barrier if dt was 1ms
        const maxV = 40;
        const clampedVx = Math.max(-maxV, Math.min(maxV, dragInfo.current.vx));
        const clampedVy = Math.max(-maxV, Math.min(maxV, dragInfo.current.vy));
        window.electronAPI.endDrag(clampedVx, clampedVy, true);
      } else {
        // It was just a click. We MUST send endDrag(0,0) to release her physics!
        window.electronAPI.endDrag(0, 0, false);
      }
    }
  };

  const handleAvatarClick = () => {
    if (dragInfo.current.isDragged) return; // Prevent click if dragged

    // Hide settings if open
    setSettingsVisible(false);
    
    // Trigger bounce
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    // Toggle chat bubble
    setChatVisible(true);
  };

  const handleAvatarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setChatVisible(false);
    setInputVisible(false);
    setSettingsVisible(true);
  };

  const handleChatBubbleClick = () => {
    // Open input tray
    setInputVisible(true);
  };

  const handleMessageSubmit = async (prompt: string) => {
    setInputVisible(false);
    setChatVisible(true);
    setState('thinking'); // Thinking

    try {
      const response = await window.electronAPI.sendToOllama(prompt);
      setLastMessage(response);
      setState('ready'); // Back to ready
    } catch (err) {
      console.error(err);
      setLastMessage("I'm offline right now.");
      setState('idle'); // Offline
    }
  };

  return (
    <div className="app-container" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      position: 'relative'
    }}>
      <SettingsMenu
        isVisible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <div style={{
        position: 'absolute',
        bottom: '55px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '90%',
        maxWidth: '300px',
        zIndex: 10
      }}>
        <InputTray 
          isVisible={inputVisible}
          onSubmit={handleMessageSubmit}
          onClose={() => setInputVisible(false)}
        />
        <ChatBubble 
          message={lastMessage} 
          isVisible={chatVisible && !settingsVisible} 
          onClick={handleChatBubbleClick}
          isThinking={state === 'thinking'}
        />
      </div>

      <BuddyAvatar 
        state={state}
        onClick={handleAvatarClick}
        onContextMenu={handleAvatarContextMenu}
        isBouncing={isBouncing}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

export default App;
