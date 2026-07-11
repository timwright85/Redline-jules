// ==========================================
// USER INTERFACE & CONTROLS
// ==========================================

/**
 * updateScoreEngine
 * Increases the global token score by the amount passed in,
 * pads the output to maintain a 6-digit visual appearance,
 * automatically saves the score to localStorage, and immediately
 * unlocks hard mode if the player crosses the 1M token threshold.
 */
function updateScoreEngine(amt) {
    STATE.score += Math.floor(amt);
    let sStr = STATE.score.toString();
    while(sStr.length < 6) sStr = "0" + sStr; // Zero-pad for aesthetic
    document.getElementById('hud-score').innerText = sStr;

    // Check unlock
    if (!STATE.hasHardModeUnlocked && STATE.score >= 1000000) {
        STATE.hasHardModeUnlocked = true;
    }

    saveGameState();
}

/**
 * displayScreenFloatingText
 * Injects a temporary `div` onto the screen simulating a damage number
 * popping out of an enemy. The text animates upwards using CSS and then
 * removes itself automatically via a timeout.
 */
function displayScreenFloatingText(text, hexColor) {
    const div = document.createElement('div');
    div.className = 'damage-number';
    div.innerText = text;
    div.style.left = '50%';
    div.style.top = '45%';

    // Map standard hex strings to specific text-shadow colors
    let colorStr = hexColor === 0x00f2ff ? '#0055aa' : '#550000';
    if (STATE.isHardMode) {
        colorStr = '#555555'; // unified shadow for inverted hard mode
    }

    div.style.textShadow = `2px 2px 0px ${colorStr}, -1px -1px 0px #000`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 750); // Destroy element after 750ms
}

function triggerGrandVictoryProtocol() {
    STATE.gameBeaten = true;
    STATE.gameActive = false;

    // Hide mobile controls
    document.getElementById('mobile-controls').style.display = 'none';

    if (controls.isLocked) controls.unlock();
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'flex';
    document.getElementById('credits-container').classList.add('start-credits');

    // Add the fade-in class for the reboot button so it appears when credits finish
    const rebootBtn = document.getElementById('reboot-btn');
    rebootBtn.style.display = 'block';
    rebootBtn.classList.add('fade-in-reboot');

    if (AUDIO.initialized) AUDIO.poly.triggerAttackRelease(["C4", "E4", "G4", "B4"], "2n");
}

function engageOpticsZoom(active) {
    STATE.isScoped = active;
    const ring = document.getElementById('reticle-ring');
    ring.style.width = active ? '20px' : '36px';
    ring.style.height = active ? '20px' : '36px';
}

function toggleWarpConsole(isCancel = false) {
    const overlay = document.getElementById('warp-overlay'), input = document.getElementById('warp-input');
    if (overlay.style.display === 'flex') {
        if (!isCancel) {
            const cmd = input.value.trim().toUpperCase();
            if (cmd.startsWith("WAVE")) {
                const extractedNum = parseInt(cmd.replace("WAVE", ""));
                if (!isNaN(extractedNum) && extractedNum >= 1 && extractedNum <= 50) {
                    clearActiveTargets();
                    if(activeCoin) { scene.remove(activeCoin); activeCoin = null; }
                    STATE.currentWave = extractedNum;
                    executeDeploymentWave();
                }
            } else if (cmd === "SLOW") {
                STATE.slowMoActive = !STATE.slowMoActive;
                document.getElementById('slow-mo-overlay').style.opacity = STATE.slowMoActive ? 1 : 0;
            }
        }
        input.value = "";
        overlay.style.display = 'none';
        if (!STATE.isMobile) controls.lock();
    } else {
        if (!STATE.isMobile) controls.unlock();
        overlay.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    }
}

// ==========================================
// MOBILE TOUCH LOGIC
// ==========================================

let leftJoystickTouchId = null;
let rightJoystickTouchId = null;
let lastTouchX = 0;
let lastTouchY = 0;

/**
 * setupMobileControls
 * Identifies if the player is on a touch device. If they are, it binds
 * event listeners to map virtual screen taps and drags directly to the
 * physics engine variables (`STATE.input.w` etc. and `camera.quaternion`).
 */
function setupMobileControls() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    STATE.isMobile = true;

    const overlay = document.getElementById('mobile-controls');

    // Joystick elements
    const leftJoy = document.getElementById('joystick-left');
    const leftKnob = document.getElementById('joystick-knob-left');
    const rightJoy = document.getElementById('joystick-right');
    const rightKnob = document.getElementById('joystick-knob-right');

    let leftJoyRect, rightJoyRect;

    function resetJoystick(knob, isLeft) {
        knob.style.transform = `translate(-50%, -50%)`;
        if (isLeft) {
            STATE.input.w = 0; STATE.input.a = 0; STATE.input.s = 0; STATE.input.d = 0;
            leftJoystickTouchId = null;
        } else {
            STATE.mobileLookDelta.x = 0;
            STATE.mobileLookDelta.y = 0;
            rightJoystickTouchId = null;
        }
    }

    document.addEventListener('touchstart', (e) => {
        if (!STATE.gameActive) return;
        leftJoyRect = leftJoy.getBoundingClientRect();
        rightJoyRect = rightJoy.getBoundingClientRect();

        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];

            // Check left joystick tap location
            if (t.clientX >= leftJoyRect.left && t.clientX <= leftJoyRect.right &&
                t.clientY >= leftJoyRect.top && t.clientY <= leftJoyRect.bottom) {
                leftJoystickTouchId = t.identifier;
            }
            // Check right joystick tap location
            else if (t.clientX >= rightJoyRect.left && t.clientX <= rightJoyRect.right &&
                     t.clientY >= rightJoyRect.top && t.clientY <= rightJoyRect.bottom) {
                rightJoystickTouchId = t.identifier;
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
            }
        }
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
        if (!STATE.gameActive) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];

            if (t.identifier === leftJoystickTouchId) {
                e.preventDefault();
                let centerX = leftJoyRect.left + leftJoyRect.width / 2;
                let centerY = leftJoyRect.top + leftJoyRect.height / 2;
                let dx = t.clientX - centerX;
                let dy = t.clientY - centerY;

                // Clamp joystick visual to max distance
                let dist = Math.sqrt(dx*dx + dy*dy);
                let maxDist = leftJoyRect.width / 2;
                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }

                leftKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                // Map mathematical drag output to logical WASD input state
                STATE.input.w = dy < -20 ? 1 : 0;
                STATE.input.s = dy > 20 ? 1 : 0;
                STATE.input.a = dx < -20 ? 1 : 0;
                STATE.input.d = dx > 20 ? 1 : 0;
            }
            else if (t.identifier === rightJoystickTouchId) {
                e.preventDefault();

                // Get joystick center
                let centerX = rightJoyRect.left + rightJoyRect.width / 2;
                let centerY = rightJoyRect.top + rightJoyRect.height / 2;

                let kdx = t.clientX - centerX;
                let kdy = t.clientY - centerY;

                // Clamp visual knob
                let dist = Math.sqrt(kdx*kdx + kdy*kdy);
                let maxDist = rightJoyRect.width / 2;
                if (dist > maxDist) {
                    kdx = (kdx / dist) * maxDist;
                    kdy = (kdy / dist) * maxDist;
                }
                rightKnob.style.transform = `translate(calc(-50% + ${kdx}px), calc(-50% + ${kdy}px))`;

                // Set continuous rotation velocity based on joystick displacement relative to center
                // Normalize it from -1.0 to 1.0 based on maxDist
                STATE.mobileLookDelta.x = kdx / maxDist;
                STATE.mobileLookDelta.y = kdy / maxDist;
            }
        }
    }, {passive: false});

    document.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === leftJoystickTouchId) resetJoystick(leftKnob, true);
            if (t.identifier === rightJoystickTouchId) resetJoystick(rightKnob, false);
        }
    });

    // Action Buttons
    const btnJump = document.getElementById('btn-jump');
    const btnDash = document.getElementById('btn-dash');
    const btnScope = document.getElementById('btn-scope');
    const btnShoot = document.getElementById('btn-shoot');
    const btnCheat = document.getElementById('btn-cheat');

    // Removed e.preventDefault() on action buttons to prevent them from blocking concurrent multi-touch events
    // across the screen (like dragging the joystick while scoping).
    btnJump.addEventListener('touchstart', (e) => { if (STATE.canJump) { STATE.velocity.y = CONFIG.JUMP; STATE.canJump = false; if(AUDIO.initialized) AUDIO.synth.triggerAttackRelease("E2", "16n"); } });
    btnDash.addEventListener('touchstart', (e) => { executeVelocityDash(); });
    btnCheat.addEventListener('touchstart', (e) => { toggleWarpConsole(); });
    btnScope.addEventListener('touchstart', (e) => { engageOpticsZoom(true); });
    btnScope.addEventListener('touchend', (e) => { engageOpticsZoom(false); });
    btnShoot.addEventListener('touchstart', (e) => { if(STATE.gameActive && !STATE.gameBeaten) emitWeaponDischarge(); });
}
