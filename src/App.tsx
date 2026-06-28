import { useState, useEffect } from 'react';
import { BuddyAvatar } from './components/BuddyAvatar';
import { ChatBubble } from './components/ChatBubble';
import { InputTray } from './components/InputTray';
import { SettingsMenu } from './components/SettingsMenu';
import './index.css';

function App() {
  const [state, setState] = useState<1 | 2 | 3 | 4>(3); // Default to 3 (Connected & Ready)
  const [chatVisible, setChatVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lastMessage, setLastMessage] = useState("Hello! I'm here.");
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    // Listen for AI state changes from main process if implemented
    if (window.electronAPI.onAiStateChange) {
      window.electronAPI.onAiStateChange((newState) => {
        setState(newState);
      });
    }

    if (window.electronAPI.onProactiveMessage) {
      window.electronAPI.onProactiveMessage((msg) => {
        setLastMessage(msg);
        setChatVisible(true);
        // Trigger bounce
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500);
      });
    }

    // Ping Ollama on startup to check connection if needed
    // Assuming state 3 is successful connection
    setState(3);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Auto-hide after 5 seconds if chat is visible, input is NOT visible, not thinking, and settings closed
    if (chatVisible && !inputVisible && state !== 4 && !settingsVisible) {
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
    const handleMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      // If the element is the root or the app-container, we are hovering over empty transparent space.
      const isInteractive = el && el.id !== 'root' && el.tagName !== 'HTML' && el.tagName !== 'BODY' && !(el as HTMLElement).className.includes('app-container');
      if (window.electronAPI.setIgnoreMouseEvents) {
        window.electronAPI.setIgnoreMouseEvents(!isInteractive);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAvatarClick = () => {
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
    setState(4); // Thinking

    try {
      const response = await window.electronAPI.sendToOllama(prompt);
      setLastMessage(response);
      setState(3); // Back to ready
    } catch (err) {
      console.error(err);
      setLastMessage("I'm offline right now.");
      setState(1); // Offline
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
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40px', WebkitAppRegion: 'drag' }} />

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
          isThinking={state === 4}
        />
      </div>

      <BuddyAvatar 
        state={state}
        onClick={handleAvatarClick}
        onContextMenu={handleAvatarContextMenu}
        isBouncing={isBouncing}
      />
    </div>
  );
}

export default App;
