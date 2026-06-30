# My-Buddy Image States (buddyim)

This document defines the exact required states and animation behaviors for all Avatar character bundles in the My-Buddy application. When generating new characters or parsing existing ones, agents MUST adhere to these exact poses to ensure true frame-by-frame animation rather than cheap programmatic stretching/skewing.

## Required Image States & Behaviors

Every Avatar bundle must contain the following images (referenced in `manifest.json`), with the exact physiological behaviors described below:

### 1. `idle.png` & `ready.png`
*   **Pose**: Base standing stance. Character is standing still, facing forward or slightly angled, holding their weapon or signature item normally.
*   **Purpose**: The default fallback state when not moving or doing a specific action.

### 2. `walking_left.png` (Walk Frame 1)
*   **Pose**: The character is mid-stride. The **right leg** (front leg from viewer's perspective) is stepping forward, bent at the knee, with the foot slightly off the ground. The **left leg** (back leg) is straight and pushing off the ground. 
*   **Purpose**: Creates the first half of a true walk cycle by alternating leg positions.

### 3. `walking_left_2.png` (Walk Frame 2)
*   **Pose**: The character is completing the stride. The **right leg** is now straight and firmly planted on the ground. The **left leg** is lifted, stepping forward, and bent at the knee.
*   **Purpose**: Creates the second half of the walk cycle. Alternating between `walking_left.png` and `walking_left_2.png` creates the illusion of actual locomotion rather than just sliding.

### 4. `thinking.png`
*   **Pose**: One hand is brought up to the chin in a contemplative gesture. Eyes are looking slightly upward. The weapon is sheathed, hidden, or resting.
*   **Purpose**: Visually indicates that the AI is processing a prompt or generating a response.

### 5. `dizzy.png`
*   **Pose**: Eyes are replaced with dizzy swirls. The mouth is open in a sigh or groan, and a teardrop is visible. The posture is slightly slouched or staggering.
*   **Purpose**: A humorous state triggered when the user spins the character rapidly across the screen.

### 6. `active.png` / `very_active.png`
*   **Pose**: The character takes a more dynamic, battle-ready stance. Legs are spread slightly wider, the center of gravity is lowered, and the weapon is raised or held aggressively. 
*   **Purpose**: Indicates high system resource usage (RAM/CPU) or a heightened state of alert.

### 7. `blink.png`
*   **Pose**: The eyes are fully closed, but the rest of the body remains identical to the `idle.png` pose.
*   **Purpose**: Adds lifelike micro-animations to the idle state so the character doesn't feel like a static statue.

### 8. `look_around.png` / `glance_left.png` / `glance_right.png`
*   **Pose**: The head is physically turned to face different directions while the body remains mostly stationary.
*   **Purpose**: Another micro-animation that makes the character feel alive and observant of the desktop environment.

### 9. `paused.png`
*   **Pose**: The character is grayed out or darkened, often with a subtle sleeping, resting, or "do not disturb" pose.
*   **Purpose**: Indicates the application or AI polling is currently paused.

---
**Note to Agents**: Do NOT fake animations by taking a single static image and skewing/stretching it via code. Always attempt to provide distinct image files that showcase the actual physical changes described above.
