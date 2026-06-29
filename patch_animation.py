import os

path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useRef import
content = content.replace(
    "import { useState, useEffect, useRef } from 'react';",
    "import { useState, useEffect, useRef } from 'react';"
)
# useRef is already imported ✅

# Add animationLock ref after the last state declaration
old = "  const [isBouncing, setIsBouncing] = useState(false);"
new = """  const [isBouncing, setIsBouncing] = useState(false);
  const animationLock = useRef<string | null>(null);"""

content = content.replace(old, new)

# Fix the micro-action handler to set animationLock
old = """  useEffect(() => {
    if (window.electronAPI.onMicroAction) {
      window.electronAPI.onMicroAction((action) => {
        if (action === 'bounce') {
          setIsBouncing(true);
          setTimeout(() => setIsBouncing(false), 500);
        }
        if (action === 'blink') {
          setState('blink');
          setTimeout(() => { setState(s => s === 'blink' ? 'ready' : s); }, 200);
        } else if (action === 'glance-left') {
          setState('glance-left');
          setTimeout(() => { setState(s => s === 'glance-left' ? 'ready' : s); }, 400);
        } else if (action === 'glance-right') {
          setState('glance-right');
          setTimeout(() => { setState(s => s === 'glance-right' ? 'ready' : s); }, 400);
        } else if (action === 'look-around') {
          setState('glance-left');
          setTimeout(() => {
            setState('glance-right');
            setTimeout(() => { setState(s => s === 'glance-right' ? 'ready' : s); }, 400);
          }, 400);
        }
      });
    }
  }, []);"""

new = """  useEffect(() => {
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
            setState('ready');
          }, 200);
        } else if (action === 'glance-left') {
          setState('glance-left');
          animationLock.current = 'glance-left';
          setTimeout(() => {
            animationLock.current = null;
            setState('ready');
          }, 400);
        } else if (action === 'glance-right') {
          setState('glance-right');
          animationLock.current = 'glance-right';
          setTimeout(() => {
            animationLock.current = null;
            setState('ready');
          }, 400);
        } else if (action === 'look-around') {
          setState('look-around');
          animationLock.current = 'look-around';
          setTimeout(() => {
            setState('glance-left');
            animationLock.current = null;
            setTimeout(() => { setState('ready'); }, 400);
          }, 300);
        }
      });
    }
  }, []);"""

content = content.replace(old, new)

# Fix the ai-state-change listener to respect animationLock
old = """  useEffect(() => {
    // Listen for AI state changes from main process if implemented
    if (window.electronAPI.onAiStateChange) {
      window.electronAPI.onAiStateChange((newState: string) => {
        setState(newState as any);
      });
    }"""

new = """  useEffect(() => {
    // Listen for AI state changes from main process if implemented
    if (window.electronAPI.onAiStateChange) {
      window.electronAPI.onAiStateChange((newState: string) => {
        // Don't override micro-animations
        if (!animationLock.current) {
          setState(newState as any);
        }
      });
    }"""

content = content.replace(old, new)

# Remove glance states from the walking animation trigger in BuddyAvatar
# (glances shouldn't animate - they're static holds)
path2 = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

# Remove glance-left and glance-right from animation trigger
old2 = "if (state === 'walking-left' || state === 'walking-right' || state === 'glance-left' || state === 'glance-right')"
new2 = "if (state === 'walking-left' || state === 'walking-right')"
content2 = content2.replace(old2, new2)

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed!')