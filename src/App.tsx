import { useState, useEffect } from 'react';
import { BuddyAvatar } from './components/BuddyAvatar';
import { ChatBubble } from './components/ChatBubble';
import { InputTray } from './components/InputTray';
import './index.css';

function App() {
  const [state, setState] = useState<1 | 2 | 3 | 4>(3); // Default to 3 (Connected & Ready)
  const [chatVisible, setChatVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [lastMessage, setLastMessage] = useState("Hello! I'm here.");
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    // Listen for AI state changes from main process if implemented
    if (window.electronAPI.onAiStateChange) {
      window.electronAPI.onAiStateChange((newState) => {
        setState(newState);
      });
    }

    // Ping Ollama on startup to check connection if needed
    // Assuming state 3 is successful connection
    setState(3);
  }, []);

  const handleAvatarClick = () => {
    // Trigger bounce
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    // Toggle chat bubble
    setChatVisible(true);
    
    // If chat bubble was already visible, maybe toggle input instead or just keep it open
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
      {/* Draggable header area if needed, but since it's a fixed buddy, we might not need it */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40px', WebkitAppRegion: 'drag' }} />

      <ChatBubble 
        message={lastMessage} 
        isVisible={chatVisible} 
        onClick={handleChatBubbleClick}
        isThinking={state === 4}
      />
      
      <InputTray 
        isVisible={inputVisible}
        onSubmit={handleMessageSubmit}
        onClose={() => setInputVisible(false)}
      />

      <BuddyAvatar 
        state={state}
        onClick={handleAvatarClick}
        isBouncing={isBouncing}
      />
    </div>
  );
}

export default App;
