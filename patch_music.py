import os

path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import isSpotifyPlaying
old = "import { saveSpotifyConfig, authenticateSpotify, loadSpotifyConfig } from './spotifyService.js'"
new = "import { saveSpotifyConfig, authenticateSpotify, loadSpotifyConfig, isSpotifyPlaying } from './spotifyService.js'"
content = content.replace(old, new)

# 2. Add music tracking variables
old = "let hasGreeted = false"
new = """let hasGreeted = false
let wasMusicPlaying = false"""
content = content.replace(old, new)

# 3. Add music-aware mood boost in the mood system
old = """      // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime"""
new = """      // Music awareness - boost mood when Spotify is playing
      const musicPlaying = isSpotifyPlaying()
      if (musicPlaying && !wasMusicPlaying) {
        // Music just started! React with a bounce
        sendMicroAction('bounce')
        lastInteractionTime = Date.now()
        if (win && !win.isDestroyed()) {
          const reactions = ["*bops to the beat*", "*music makes me happy*", "*starts dancing*", "*feeling the rhythm*"]
          win.webContents.send('proactive-message', reactions[Math.floor(Math.random() * reactions.length)])
        }
      } else if (!musicPlaying && wasMusicPlaying) {
        // Music stopped
        hasGreeted = false
      }
      wasMusicPlaying = musicPlaying

      // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime
        if (musicPlaying) { mood = 'bouncy'; return }"""
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts updated with music awareness!')