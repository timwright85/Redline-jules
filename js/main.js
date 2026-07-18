// ==========================================
// MAIN INITIALIZATION & GAME LOOP
// ==========================================

window.onload = () => {
    loadGameState(); // load tokens and status from local storage

    // Update version display
    if (typeof GAME_VERSION !== 'undefined') {
        const versionEl = document.getElementById('game-version');
        if (versionEl) versionEl.innerText = "ULTIMATE PROTOCOL " + GAME_VERSION;
    }
    if (typeof LATEST_CHANGE !== 'undefined') {
        const latestEl = document.getElementById('game-latest-msg');
        if (latestEl) latestEl.innerText = "LATEST: " + LATEST_CHANGE;
    }

    // Update main menu tokens display
    const tokensDisplay = document.getElementById('menu-tokens');
    if (tokensDisplay) {
        tokensDisplay.innerText = "TOTAL TOKENS: " + STATE.score;
    }

    // Show hard mode button if unlocked
    if (STATE.hasHardModeUnlocked) {
        document.getElementById('hard-mode-btn').style.display = 'inline-block';
    }

    // Show skip to credits button by default on home screen as requested.
    document.getElementById('skip-credits-btn').style.display = 'inline-block';

    initRenderCore();
    initEnvironmentSpace();
    setupInteractions();
    setupMobileControls();

    // Pre-fetch credits and changelog data
    if (typeof populateCreditsAndChangelog === 'function') {
        populateCreditsAndChangelog();
    }

    animateLoop();
};

function initRenderCore() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050000, 0.0035);

    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, renderer.domElement);

    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.35, 0.15);
    composer.addPass(bloomPass);

    const rgbShiftPass = new THREE.ShaderPass(THREE.RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.0022;
    composer.addPass(rgbShiftPass);
}

function initEnvironmentSpace() {
    ambientLight = new THREE.AmbientLight(0x0c0a15);
    scene.add(ambientLight);

    muzzleLight = new THREE.PointLight(getHexColor(0xff003c), 0, 35);
    scene.add(muzzleLight);

    // Enhanced brighter neon grid floor
    // Hard mode flips colors, but base grid should be prominent red.
    const gridColor = getHexColor(0xff003c);
    const gridCenterColor = getHexColor(0xff3366); // brighter line color

    grid = new THREE.GridHelper(600, 60, gridCenterColor, gridColor);
    grid.position.y = 0;

    // Add slightly transparent plane to give a 'glow' base
    const planeGeo = new THREE.PlaneGeometry(600, 600);
    const planeMat = new THREE.MeshBasicMaterial({color: getHexColor(0x110000), transparent: true, opacity: 0.8});
    basePlane = new THREE.Mesh(planeGeo, planeMat);
    basePlane.rotation.x = -Math.PI / 2;
    basePlane.position.y = -0.1;
    scene.add(basePlane);

    scene.add(grid);

    const boundGeo = new THREE.RingGeometry(CONFIG.BOUNDS - 2, CONFIG.BOUNDS, 64);
    const boundMat = new THREE.MeshBasicMaterial({ color: getHexColor(0xff003c), side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    boundRing = new THREE.Mesh(boundGeo, boundMat);
    boundRing.rotation.x = Math.PI / 2;
    boundRing.position.y = 0.2;
    scene.add(boundRing);

    camera.position.set(0, 1.6, 0);
}

function setupInteractions() {
    const handleStartBtn = async (e) => {
        if (e) e.preventDefault();
        STATE.isHardMode = false;
        requestMobileFullscreen();
        await startGameSequence();
    };
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', handleStartBtn);

    const handleHardModeBtn = async (e) => {
        if (e) e.preventDefault();
        STATE.isHardMode = true;
        requestMobileFullscreen();
        // Re-init environment with flipped colors if necessary
        scene.remove(grid);
        scene.remove(muzzleLight);
        scene.remove(basePlane);
        scene.remove(boundRing);
        scene.remove(ambientLight);
        initEnvironmentSpace();
        await startGameSequence();
    };
    const hardModeBtn = document.getElementById('hard-mode-btn');
    hardModeBtn.addEventListener('click', handleHardModeBtn);

    function requestMobileFullscreen() {
        if (STATE.isMobile || ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            try {
                if (document.documentElement.requestFullscreen) {
                    const promise = document.documentElement.requestFullscreen();
                    if (promise && typeof promise.catch === 'function') {
                        promise.catch((err) => console.log("requestFullscreen failed:", err));
                    }
                } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                    const promise = document.documentElement.webkitRequestFullscreen();
                    if (promise && typeof promise.catch === 'function') {
                        promise.catch((err) => console.log("webkitRequestFullscreen failed:", err));
                    }
                }
            } catch (err) {
                console.log("Fullscreen request failed safely:", err);
            }
        }
    }

    const handleSkipCreditsBtn = (e) => {
        if (e) e.preventDefault();
        document.getElementById('menu').style.display = 'none';
        triggerGrandVictoryProtocol();
    };
    const skipCreditsBtn = document.getElementById('skip-credits-btn');
    skipCreditsBtn.addEventListener('click', handleSkipCreditsBtn);

    const handleRebootBtn = (e) => {
        if (e) e.preventDefault();
        location.reload();
    };
    const rebootBtn = document.getElementById('reboot-btn');
    rebootBtn.addEventListener('click', handleRebootBtn);

    // Warp Console Buttons
    const warpSubmit = document.getElementById('warp-submit-btn');
    const warpExit = document.getElementById('warp-exit-btn');

    warpSubmit.addEventListener('click', (e) => {
        e.preventDefault();
        toggleWarpConsole();
    });
    warpExit.addEventListener('click', (e) => {
        e.preventDefault();
        toggleWarpConsole(true);
    });

    async function startGameSequence() {
        await Tone.start();
        initAudioEngine();
        if (!STATE.isMobile) {
            controls.lock();
        } else {
            // For mobile, skip pointer lock, just hide menu and start
            document.getElementById('menu').style.display = 'none';
            document.getElementById('mobile-controls').style.display = 'block';
            STATE.gameActive = true;
            if(targets.length === 0 && !STATE.gameBeaten && !activeCoin) executeDeploymentWave();
        }
    }

    controls.addEventListener('lock', () => {
        document.getElementById('menu').style.display = 'none';
        STATE.gameActive = true;
        if(targets.length === 0 && !STATE.gameBeaten && !activeCoin) executeDeploymentWave();
    });

    controls.addEventListener('unlock', () => {
        if (!STATE.gameBeaten && document.getElementById('warp-overlay').style.display !== 'flex' && !STATE.isMobile) {
            document.getElementById('menu').style.display = 'flex';
            STATE.gameActive = false;
            checkForUpdates();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!STATE.gameActive && e.code !== 'Enter') return;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') STATE.input.w = 1;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') STATE.input.s = 1;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') STATE.input.a = 1;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') STATE.input.d = 1;

        if (e.code === 'Space' && STATE.canJump) {
            STATE.velocity.y = CONFIG.JUMP; STATE.canJump = false;
            if(AUDIO.initialized) AUDIO.synth.triggerAttackRelease("E2", "16n");
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') executeVelocityDash();
        if (e.code === 'Enter') { e.preventDefault(); toggleWarpConsole(); }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') STATE.input.w = 0;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') STATE.input.s = 0;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') STATE.input.a = 0;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') STATE.input.d = 0;
    });

    renderer.domElement.addEventListener('mousedown', (e) => {
        if ((!controls.isLocked && !STATE.isMobile) || STATE.gameBeaten) return;
        if (e.button === 0) emitWeaponDischarge();
        if (e.button === 2) engageOpticsZoom(true);
    });

    document.addEventListener('mouseup', (e) => { if (e.button === 2) engageOpticsZoom(false); });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animateLoop() {
    requestAnimationFrame(animateLoop);
    const time = performance.now();
    let delta = (time - lastTime) / 1000.0;
    if (delta > 0.1) delta = 0.1;
    lastTime = time;

    STATE.timeScale = STATE.slowMoActive ? 0.35 : 1.0;
    const dt = delta * STATE.timeScale;

    if (STATE.gameActive && !STATE.gameBeaten) {

        // --- PHYSICS / MOVEMENT UPDATE ---
        STATE.velocity.x -= STATE.velocity.x * CONFIG.FRICTION * delta;
        STATE.velocity.z -= STATE.velocity.z * CONFIG.FRICTION * delta;
        if (!STATE.canJump) STATE.velocity.y -= CONFIG.GRAVITY * delta;

        const speedScalar = CONFIG.SPEED * 12.0;
        if (STATE.input.w) STATE.velocity.z -= speedScalar * delta;
        if (STATE.input.s) STATE.velocity.z += speedScalar * delta;
        if (STATE.input.a) STATE.velocity.x -= speedScalar * delta;
        if (STATE.input.d) STATE.velocity.x += speedScalar * delta;

        controls.moveRight(STATE.velocity.x * delta);
        controls.moveForward(-STATE.velocity.z * delta);
        camera.position.y += STATE.velocity.y * delta;

        // Mobile continuous look rotation logic
        if (STATE.isMobile && (STATE.mobileLookDelta.x !== 0 || STATE.mobileLookDelta.y !== 0)) {
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(camera.quaternion);

            // Apply delta scaled by time. Tweak the 2.5 multiplier for rotation speed.
            euler.y -= STATE.mobileLookDelta.x * 2.5 * delta;
            euler.x -= STATE.mobileLookDelta.y * 2.0 * delta;

            // Clamp pitch to prevent looking upside down
            euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }

        // Ground collision
        if (camera.position.y < 1.6) {
            STATE.velocity.y = 0;
            camera.position.y = 1.6;
            STATE.canJump = true;
        }

        // Boundary constraint mapping
        const distFromCenter = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
        if (distFromCenter > CONFIG.BOUNDS) {
            const angle = Math.atan2(camera.position.z, camera.position.x);
            camera.position.x = Math.cos(angle) * CONFIG.BOUNDS;
            camera.position.z = Math.sin(angle) * CONFIG.BOUNDS;
        }

        // Camera FOV scoping effect
        camera.fov = THREE.MathUtils.lerp(camera.fov, STATE.isScoped ? 32 : 85, 12.0 * delta);
        camera.updateProjectionMatrix();

        if(STATE.crosshairTimer > 0) {
            STATE.crosshairTimer--;
            if(STATE.crosshairTimer === 0) document.getElementById('reticle-ring').style.transform = 'rotate(45deg) scale(1.0)';
        }

        if (STATE.dashCooldown > 0) {
            STATE.dashCooldown -= delta * 1000.0;
            // HUD width linearly interpolates back to 100% based on configured cooldown max
            document.getElementById('dash-bar').style.width = `${(1.0 - Math.max(0, STATE.dashCooldown / CONFIG.DASH_COOLDOWN)) * 100}%`;
        } else {
            document.getElementById('dash-bar').style.width = '100%';
        }

        if (activeCoin) {
            activeCoin.rotation.z += 0.04 * STATE.timeScale;
            if (camera.position.distanceTo(activeCoin.position) < 7.5) {
                scene.remove(activeCoin);
                activeCoin = null;
                triggerGrandVictoryProtocol();
            }
        }
    }

    if(grid) {
        // Snap grid position relative to the camera but offset by modulo to create continuous motion.
        // This makes it act like an infinite grid that moves properly under the player.
        grid.position.x = camera.position.x - (camera.position.x % 10);
        grid.position.z = camera.position.z - (camera.position.z % 10);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.addScaledVector(p.userData.velocity, dt);
        p.userData.velocity.y -= CONFIG.GRAVITY * 0.4 * dt;
        p.userData.life -= delta * 1.8;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // --- ENEMY AI UPDATES ---
    targets.forEach(t => {
        const data = t.userData;
        t.rotation.y += 0.03 * STATE.timeScale;
        t.rotation.x += 0.01 * STATE.timeScale;

        const trackingVector = new THREE.Vector3().subVectors(camera.position, t.position);
        trackingVector.y = 0;
        trackingVector.normalize();

        // Calculate 3D distance, but we also care about XZ overlap for player collision
        const distance = camera.position.distanceTo(t.position);

        // Calculate rubber-band attraction factor: slow when close, fast when far.
        const attraction = data.isBoss ? 1.0 : Math.max(0.05, (distance - 40) / 100.0);

        // --- PLAYER COLLISION ---
        // Establish collision radius based on enemy type
        let colRadius = 5.0; // default for swarm, standard, dasher, ghost
        if (data.type === 'tank' || data.type === 'tesseract') colRadius = 8.0;
        if (data.type === 'miniboss') colRadius = 12.0;
        if (data.type === 'normalboss') colRadius = 18.0;
        if (data.type === 'boss') colRadius = 22.0;

        // Player has an effective radius of about 2 units. Total required distance:
        const minDistance = colRadius + 2.0;

        // Calculate planar (XZ) distance to ignore Y axis height differences for cylinder-like collision
        const dx = camera.position.x - t.position.x;
        const dz = camera.position.z - t.position.z;
        const planarDist = Math.sqrt(dx*dx + dz*dz);

        if (planarDist > 0 && planarDist < minDistance) {
            // We have a collision! Push them apart.
            const overlap = minDistance - planarDist;

            // Normalize push vector
            const pushX = dx / planarDist;
            const pushZ = dz / planarDist;

            // Push the camera strictly in world coordinates so bounce is always outward from the enemy
            camera.position.x += pushX * overlap * 0.15;
            camera.position.z += pushZ * overlap * 0.15;

            // Push the enemy away slightly in the opposite direction
            t.position.x -= pushX * overlap * 0.85;
            t.position.z -= pushZ * overlap * 0.85;

            // Zero out local velocity to prevent sliding back in during the same frame
            STATE.velocity.x = 0;
            STATE.velocity.z = 0;
        }

        if (data.isBoss) {
            data.shieldTicks += dt;
            if (data.shieldTicks > 4.5) {
                data.shieldOn = !data.shieldOn;
                if(t.children.length > 1) { // some bosses might not have shield mesh if normal/mini
                    t.children[1].material.color.setHex(getHexColor(data.shieldOn ? 0x00f2ff : 0xff003c));
                    // Drastically drop opacity when "off" and max it when "on" for high visibility
                    t.children[1].material.opacity = data.shieldOn ? 0.8 : 0.1;
                }
                data.shieldTicks = 0;
            }

            // Pulse the shield slightly for visual flair
            if (data.shieldOn && t.children.length > 1) {
                t.children[1].scale.setScalar(1.0 + Math.sin(time * 0.005) * 0.05);
            }

            t.position.addScaledVector(trackingVector, (4.5 + (45 - data.health) / 10.0) * dt);
        }
        else if (data.type === 'tesseract') {
            data.dimensionTimer += dt;

            const outerCube = t.getObjectByName("outer"), innerCube = t.getObjectByName("inner");
            if(outerCube && innerCube) {
                outerCube.rotation.y += 0.02 * STATE.timeScale;
                innerCube.rotation.x -= 0.04 * STATE.timeScale;

                let pulseScale = 1.0 + Math.sin(time * 0.005) * 0.3;
                innerCube.scale.setScalar(pulseScale);
            }

            if (data.dimensionTimer > 3.5) {
                data.isPhasedOut = !data.isPhasedOut;
                data.dimensionTimer = 0.0;

                if (data.isPhasedOut) {
                    t.scale.set(1, 0.01, 1);
                    outerCube.material.color.setHex(getHexColor(0x331100));
                    innerCube.material.color.setHex(getHexColor(0x331100));
                } else {
                    t.scale.set(1, 1, 1);
                    t.position.addScaledVector(trackingVector, 32.0);

                    outerCube.material.color.setHex(getHexColor(0x00ff66));
                    innerCube.material.color.setHex(getHexColor(0x00ff66));
                    if (AUDIO.initialized) AUDIO.synth.triggerAttackRelease("G3", "24n");

                    setTimeout(() => {
                        if(t && t.parent) {
                            outerCube.material.color.setHex(getHexColor(0xff7f00));
                            innerCube.material.color.setHex(getHexColor(0xff7f00));
                        }
                    }, 450);
                }
            }

            if (!data.isPhasedOut) {
                t.position.addScaledVector(trackingVector, data.driftSpeed * 22.0 * dt * attraction);
            }
        }
        else {
            if (data.type === 'ghost') {
                t.position.addScaledVector(trackingVector, 7.5 * dt * attraction);
                t.position.x += Math.sin(time * 0.003 + data.offset) * 0.22;
                t.position.y = 2.0 + Math.cos(time * 0.003 + data.offset) * 1.8;
            }
            else if (data.type === 'dasher') {
                let factor = data.driftSpeed * 45.0;
                t.position.addScaledVector(trackingVector, factor * dt * attraction);
            }
            else {
                t.position.addScaledVector(trackingVector, data.driftSpeed * 42.0 * dt * attraction);
            }
        }
    });

    if(muzzleLight && muzzleLight.intensity > 0) {
        muzzleLight.intensity = Math.max(0, THREE.MathUtils.lerp(muzzleLight.intensity, 0, delta * 16.0));
    }

    composer.render();

    // Auto-save wave 25 beaten flag
    if (STATE.currentWave > 25 && !localStorage.getItem('redline_wave25_beaten')) {
        localStorage.setItem('redline_wave25_beaten', 'true');
    }
}
