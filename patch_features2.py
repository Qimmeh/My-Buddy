import os

path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add proactive timer after the mood variables
old = "let mood = 'neutral'\nlet mouseNearby = false"
new = """let mood = 'neutral'
let mouseNearby = false
let proactiveTimer = 0
let greetingTimer = 0
let hasGreeted = false

const proactiveMessages = [
  "*stretches*",
  "*wonders what you're doing*",
  "*hums a little tune*",
  "*looks around curiously*",
  "*feeling cozy today*",
  "*zzz... oh! was I sleeping?*",
  "*checks the time*",
  "*thinks about going for a walk*",
  "*notices you looking*",
  "*smiles*",
  "*daydreams*",
  "*plays with a stray pixel*",
  "*watches the cursor curiously*",
  "*feels a breeze*",
  "*notices something interesting*",
  "*happily wiggles*",
]"""

content = content.replace(old, new)

# 2. Add weather-aware mood adjustments after the mood system block
old = """        const hour = new Date().getHours()
        if (hour >= 22 || hour < 7) mood = 'sleepy'
      }"""

new = """        const hour = new Date().getHours()
        if (hour >= 22 || hour < 7) mood = 'sleepy'
        else if (hour >= 6 && hour < 12) { if (mood !== 'sleepy') mood = 'happy' }
        else if (hour >= 17 && hour < 22) { if (mood === 'neutral') mood = 'sleepy' }
      }

      // Proactive messages - every 60-120 seconds when idle and not in full mode
      if (currentMode === 'avatar' && dist < 3 && mood !== 'sleepy') {
        proactiveTimer++
        if (proactiveTimer > 3600 + Math.random() * 3600) {
          proactiveTimer = 0
          sendMicroAction('bounce')
          const msg = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)]
          if (win && !win.isDestroyed()) {
            win.webContents.send('proactive-message', msg)
          }
        }
      }

      // Greeting on return - after >5 min away, greet when mouse appears
      if (mouseNearby) {
        const awayTime = Date.now() - lastInteractionTime
        if (awayTime > 300000 && !hasGreeted) {
          hasGreeted = true
          sendMicroAction('bounce')
          const greetings = ["Welcome back!", "There you are!", "You're back!", "Hello again!", "Was wondering where you went!"]
          const msg = greetings[Math.floor(Math.random() * greetings.length)]
          if (win && !win.isDestroyed()) {
            win.webContents.send('proactive-message', msg)
          }
        }
      } else {
        hasGreeted = false
      }"""

content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts updated!')