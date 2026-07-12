// ==========================================
// STATE MANAGEMENT & GLOBALS
// ==========================================

/**
 * CONFIG holds static variables related to game constraints
 * like max speeds, physics modifiers, and global bounds.
 */
const CONFIG = {
    SPEED: 45.0,
    JUMP: 16.0,
    FRICTION: 8.5,
    GRAVITY: 52.0,
    BOUNDS: 230,
    AUDIO_PITCHES: [110, 130, 165, 196, 220, 261, 329, 392],
    DASH_COOLDOWN: 5000.0
};

/**
 * STATE holds all the dynamic properties of the game that change
 * from frame-to-frame such as current score, wave progression,
 * inputs from keyboards or touchscreens, and dynamic velocity.
 */
const STATE = {
    score: 0,
    currentWave: 1,
    gameActive: false,
    gameBeaten: false,
    slowMoActive: false,
    timeScale: 1.0,
    dashCooldown: 0.0,
    isScoped: false,
    input: { w:0, a:0, s:0, d:0 },
    velocity: new THREE.Vector3(),
    canJump: true,
    crosshairTimer: 0,
    isHardMode: false,
    hasHardModeUnlocked: false,
    isMobile: false,
    mobileLookDelta: { x: 0, y: 0 }
};

// Global rendering variables utilized by Three.js
let scene, camera, renderer, composer, controls, grid, basePlane, boundRing, ambientLight;

// Lists of entities dynamically created and destroyed during gameplay
let targets = [];
let particles = [];
let muzzleLight = null;
let activeCoin = null;

// Timing variables for smooth physics calculations
let lastTime = performance.now();

// Audio state object containing Tone.js synths and filters
const AUDIO = { synth: null, poly: null, noise: null, filter: null, bass: null, initialized: false };

/**
 * Helper function to load state from browser's localStorage.
 * Allows users to return to the game later while keeping their Tokens
 * and Hard Mode unlock status intact.
 */
function loadGameState() {
    const savedScore = localStorage.getItem('redline_tokens');
    if (savedScore !== null) {
        STATE.score = parseInt(savedScore, 10);
    }

    // Check if hard mode is unlocked threshold (1 Million tokens)
    if (STATE.score >= 1000000) {
        STATE.hasHardModeUnlocked = true;
    }
}

/**
 * Helper function to save tokens into localStorage.
 */
function saveGameState() {
    localStorage.setItem('redline_tokens', STATE.score.toString());
}
