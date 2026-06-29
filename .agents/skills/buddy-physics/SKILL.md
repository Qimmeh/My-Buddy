---
name: buddy-physics
description: Helps the agent understand and debug the custom physics engine that moves the desktop pet on the user's screen.
---

# Buddy Physics Skill

This skill provides context about how the avatar moves around the screen in the My-Buddy project. Use this knowledge whenever the user asks to modify how the buddy walks, falls, or interacts with the screen boundaries.

## Architecture
The physics loop is implemented inside `electron/main.ts` in the `startPhysicsLoop()` function.
It runs at 60 FPS using a `setInterval` loop.

## The Variables
- `px`, `py`: The current pixel position of the window.
- `vx`, `vy`: The velocity of the window in the X and Y axes.
- `w`, `h`: The size of the avatar (hardcoded to 45x45).

## Modes
1. **Walking normally**:
   - `px += vx` and `py += vy`.
   - When hitting screen bounds (`bounds.width`, `bounds.height`), it randomizes velocity slightly (`vy = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4)`) and bounces back.
2. **Being thrown (`isThrown = true`)**:
   - Uses gravity: `vy += 0.5`.
   - Uses friction: `vx *= 0.98`.
   - Bounces off the bottom of the screen (`vy = -vy * 0.6`) until `Math.abs(vy) < 2`, at which point it lands.
3. **Out of bounds respawning (`isRespawning = true`)**:
   - If thrown off the screen entirely, it hides the window, waits 3 seconds, and shoots back out from the edge it fell out of (using high velocity like `vx = 0, vy = -15` to shoot up from the bottom).

## Important Constraints
- **Performance**: Floating point coordinates must be rounded (`Math.round(px)`) before calling `win.setPosition()` to prevent blurry rendering and performance drops.
- **State Updates**: Do not flood the IPC with state changes. Only send a state update (e.g. `walking-left`) if the state actually changes, using the `lastSendState` check.
