# Click [HERE](https://timwright85.github.io/Redline-jules/Redline.html) to play REDLINE!

REDLINE is a fast-paced, 3D web-based arena shooter built with **Three.js** and **Tone.js**. It features a retro-futuristic neon aesthetic, wave-based combat, and a dynamic difficulty system.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [State Management](#state-management)
- [Development & Versioning](#development--versioning)
- [Agent Guidelines](#agent-guidelines)

---

## Architecture Overview
REDLINE follows a modular JavaScript architecture, separating concerns into specific files for state, physics, entities, audio, and UI.

- **Rendering:** Powered by Three.js (r128) with post-processing (UnrealBloom, RGBShift) for a CRT/neon effect.
- **Audio:** Driven by Tone.js, featuring synthesized sound effects and procedural background drones.
- **Physics:** Custom raycasting-based weapon system and velocity-based movement with dash mechanics.
- **Input:** Supports both Keyboard/Mouse (Pointer Lock API) and Mobile Touch (Virtual Joysticks).

---

## Project Structure
- `Redline.html`: The entry point that loads all dependencies and initializes the DOM.
- `css/style.css`: Contains the neon color palette (CSS variables) and CRT overlay styles.
- `js/`
  - `state.js`: **Critical.** Defines the global `STATE` and `CONFIG` objects.
  - `main.js`: Initialization, render loop, and high-level event listeners.
  - `entities.js`: Wave blueprints and enemy type definitions (standard, dasher, ghost, tank, tesseract, and bosses).
  - `physics.js`: Core movement logic, dash ability, and raycasting weapon mechanics.
  - `audio.js`: Tone.js synth configurations and audio engine initialization.
  - `ui.js`: HUD updates, menu interactions, and mobile control logic.
  - `version.js`: Auto-generated file containing the current version and latest changelog.
- `tools/`: Utility scripts for versioning and git hooks.

---

## State Management
The game's behavior is controlled by two primary objects in `js/state.js`:

1.  **`CONFIG`**: Constant values (Gravity, Speed, Jump Height, Bounds).
2.  **`STATE`**: Mutable game state (Score, Wave, Input flags, Velocity, Mobile status).

**Tip for Agents:** When modifying game balance, check `CONFIG` first. For tracking new game mechanics, add them to `STATE`.

---

## Development & Versioning
The project uses an automated versioning system.
- The base version is stored in `VERSION`.
- The patch number is determined by the git commit count.
- `js/version.js` is automatically updated via a git pre-commit hook.

### Setup
Run the following to install the necessary git hooks:
```bash
bash tools/install_hooks.sh
```

---

## Agent Guidelines
To maintain consistency and accuracy while editing REDLINE, please follow these rules:

1.  **Do Not Edit `js/version.js` Directly**: This file is overwritten by `tools/update_version.py`. Modify `VERSION` if you need to increment the major/minor version.
2.  **Centralized Interactions**: UI button listeners are managed in `setupInteractions` within `js/main.js`. Use the 'click' event with `e.preventDefault()` for cross-platform compatibility.
3.  **Mobile Compatibility**: The game detects mobile via `STATE.isMobile`. Always ensure new UI elements or controls are touch-friendly.
4.  **Three.js Version**: The project uses Three.js **r128**. Avoid using features from newer versions that may not be compatible.
5.  **Color Palette**: Use the `getHexColor()` helper in `js/entities.js` for colors to ensure they respond correctly to Hard Mode color inversion.
6.  **Verification**: When testing changes, use a local web server (e.g., `python3 -m http.server 8000`) rather than opening the HTML file directly, to avoid CORS issues with assets and Three.js.
