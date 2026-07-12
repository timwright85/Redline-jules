// ==========================================
// PHYSICS & CORE MECHANICS
// ==========================================

/**
 * executeVelocityDash
 * This function handles the logic for the "Dash" movement ability.
 * It reads the camera's forward direction to calculate exactly where the player is looking,
 * strips the vertical (Y) component to keep the dash strictly horizontal,
 * calculates a perpendicular "side" vector to allow strafing dashes,
 * and then computes the final directional vector based on the currently pressed WASD keys.
 * Finally, it multiplies this normalized vector by a massive thrust constant (150.0)
 * and sets the player's velocity to this burst, putting the ability on cooldown.
 */
function executeVelocityDash() {
    if (STATE.dashCooldown > 0) return;

    // Because STATE.velocity is used by controls.moveRight() and moveForward(),
    // we must calculate dash relative to local camera space, not absolute world space.
    let localX = 0;
    let localZ = 0;

    // In Three.js PointerLockControls, forward movement requires negative Z
    if (STATE.input.w) localZ -= 1;
    if (STATE.input.s) localZ += 1;
    if (STATE.input.a) localX -= 1;
    if (STATE.input.d) localX += 1;

    // Default to dashing forward if no movement keys are currently held
    if (localX === 0 && localZ === 0) localZ = -1;

    // Normalize so diagonal dashes aren't faster
    const len = Math.sqrt(localX * localX + localZ * localZ);
    localX /= len;
    localZ /= len;

    // Apply massive burst of velocity locally
    STATE.velocity.x += localX * 450.0;
    STATE.velocity.z += localZ * 450.0;

    // Set dash on cooldown
    STATE.dashCooldown = CONFIG.DASH_COOLDOWN;

    // Trigger visual/audio feedback
    document.getElementById('dash-bar').style.width = '0%';
    if (AUDIO.initialized) AUDIO.noise.triggerAttackRelease("8n");
}

/**
 * emitWeaponDischarge
 * Triggers when the player shoots. It creates a Raycaster (an invisible laser)
 * exactly from the center of the camera and checks if it mathematically intersects
 * with any active enemy meshes in the 3D space (`targets` array).
 * It calculates damage, checks for boss shields or phased states, handles health reductions,
 * and if an enemy's health reaches 0, it calls the explosion visual effects, removes the mesh
 * from the scene, and delegates points dynamically via the updateScoreEngine function.
 */
function emitWeaponDischarge() {
    // Visual kickback and crosshair animation
    STATE.crosshairTimer = 6;
    document.getElementById('reticle-ring').style.transform = 'rotate(135deg) scale(1.4)';
    if (AUDIO.initialized) AUDIO.noise.triggerAttackRelease("32n");

    // Flash muzzle light at the end of camera direction
    muzzleLight.position.copy(camera.position).addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion), 2);
    muzzleLight.intensity = 8.0;

    // Raycast logic: Fire an invisible line from center of screen out into the world
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(targets, true); // true = recursive check on child meshes

    if (hits.length > 0) {
        // We hit something! Find the topmost parent object of the hierarchy we hit
        let rootHit = hits[0].object;
        while (rootHit.parent && rootHit.parent !== scene) rootHit = rootHit.parent;

        const data = rootHit.userData;

        // Specific enemy logic checks
        if (data.type === 'tesseract' && data.isPhasedOut) {
            if (AUDIO.initialized) AUDIO.synth.triggerAttackRelease("D2", "32n");
            displayScreenFloatingText("PHASE-SHIFTED", 0xff7f00);
            return;
        }

        // Damage calculation (scoping does 3x damage)
        let dmg = STATE.isScoped ? 3 : 1;

        if (data.isBoss) {
            if (data.shieldOn) {
                if (AUDIO.initialized) AUDIO.synth.triggerAttackRelease("C2", "16n");
                displayScreenFloatingText("ABSORBED", 0x00f2ff);
                return;
            } else {
                data.health -= dmg;
                displayScreenFloatingText(`-${dmg}`, 0xff003c);
                if (AUDIO.initialized) AUDIO.synth.triggerAttackRelease("A3", "32n");
            }
        } else {
            data.health -= dmg;
        }

        // Death Handling
        if (data.health <= 0) {
            let explodeColor = 0xff003c;
            if(data.type === 'dasher') explodeColor = 0x00f2ff;
            if(data.type === 'ghost') explodeColor = 0xffff00;
            if(data.type === 'swarm') explodeColor = 0xff00ff;
            if(data.type === 'tank') explodeColor = 0x8a2be2;
            if(data.type === 'tesseract') explodeColor = 0x00ff66;

            // Trigger explosion logic. Invert colors if we are in hard mode context.
            triggerFractureExplosion(rootHit.position, getHexColor(explodeColor));

            const idx = targets.indexOf(rootHit);
            if (idx > -1) targets.splice(idx, 1); // remove from logic array
            scene.remove(rootHit); // remove from rendering

            // Score configuration
            const scoreMap = { swarm: 50, tank: 400, tesseract: 300, miniboss: 5000, normalboss: 10000, boss: 25000 };
            let basePoints = scoreMap[data.type] || 150;

            // Hard mode rewards players with x1.5 multiplier
            if (STATE.isHardMode) basePoints *= 1.5;

            // Apply points, scoping gives additional bonus logic
            updateScoreEngine(basePoints * (STATE.isScoped ? 1.5 : 1.0));

            // Musical cue
            if (AUDIO.initialized) {
                AUDIO.synth.triggerAttackRelease(CONFIG.AUDIO_PITCHES[Math.floor(Math.random() * CONFIG.AUDIO_PITCHES.length)], "16n");
            }

            // Wave completion logic
            if (targets.length === 0) {
                if (STATE.currentWave < 50) {
                    STATE.currentWave++;
                    executeDeploymentWave();
                } else if (!STATE.gameBeaten && !activeCoin) {
                    spawnVictoryToken();
                }
            }
        }
    }
}

/**
 * triggerFractureExplosion
 * Scatters small cubes outward starting from the death position of an enemy
 * to simulate an explosion. Each cube is given a randomized velocity and lifespan.
 */
function triggerFractureExplosion(pos, hexColor) {
    const count = 18;
    const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const mat = new THREE.MeshBasicMaterial({ color: hexColor });

    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.userData = {
            velocity: new THREE.Vector3((Math.random() - 0.5) * 25, (Math.random() - 0.3) * 20, (Math.random() - 0.5) * 25),
            life: 1.0
        };
        particles.push(p);
        scene.add(p);
    }
}
