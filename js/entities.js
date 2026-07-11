// ==========================================
// ENTITIES & WAVES
// ==========================================

// Helper function to return the correct color, potentially inverting it for Hard Mode
function getHexColor(hexVal) {
    if (STATE.isHardMode) {
        // Exact hex flip: FFFFFF - hexVal
        return 0xFFFFFF - hexVal;
    }
    return hexVal;
}

const WAVE_BLUEPRINTS = {
    // 1-5
    1:  { standard: 10 },
    2:  { dasher: 14 },
    3:  { ghost: 16 },
    4:  { swarm: 35 },
    5:  { miniboss: 1, standard: 10 },

    // 6-10
    6:  { standard: 14, ghost: 10 },
    7:  { dasher: 8, swarm: 20 },
    8:  { tank: 8, standard: 14 },
    9:  { ghost: 12, dasher: 8 },
    10: { normalboss: 1, swarm: 25, tank: 8 },

    // 11-15
    11: { standard: 20, ghost: 12 },
    12: { dasher: 12, swarm: 30 },
    13: { tank: 4, standard: 14 },
    14: { ghost: 18, dasher: 10 },
    15: { miniboss: 1, swarm: 25, tank: 5 },

    // 16-20
    16: { standard: 10, dasher: 8, ghost: 12 },
    17: { tank: 4, swarm: 20, tesseract: 10 },
    18: { standard: 15, dasher: 5, ghost: 15 },
    19: { tank: 3, swarm: 25, tesseract: 12 },
    20: { normalboss: 1, standard: 12, dasher: 6, ghost: 10 },

    // 21-25
    21: { tank: 5, swarm: 35, tesseract: 15 },
    22: { standard: 25, dasher: 15, ghost: 25 },
    23: { tank: 6, swarm: 45, tesseract: 20 },
    24: { dasher: 20, ghost: 25, standard: 20 },
    25: { boss: 1 },

    // 26-30
    26: { standard: 20, ghost: 15, swarm: 20 },
    27: { tank: 5, dasher: 15, tesseract: 10 },
    28: { swarm: 40, ghost: 20 },
    29: { tesseract: 25, standard: 15 },
    30: { normalboss: 1, dasher: 20, tank: 5 },

    // 31-35
    31: { ghost: 30, swarm: 30 },
    32: { standard: 30, tesseract: 15 },
    33: { dasher: 25, tank: 10 },
    34: { swarm: 50, standard: 20 },
    35: { miniboss: 1, tesseract: 20, ghost: 20 },

    // 36-40
    36: { standard: 25, dasher: 25, ghost: 15 },
    37: { tank: 8, swarm: 40 },
    38: { tesseract: 30, ghost: 25 },
    39: { swarm: 60, standard: 10 },
    40: { normalboss: 1, dasher: 30, tank: 10 },

    // 41-45
    41: { ghost: 40, tesseract: 20 },
    42: { standard: 35, dasher: 20, swarm: 30 },
    43: { tank: 12, tesseract: 25 },
    44: { swarm: 80 },
    45: { miniboss: 1, ghost: 35, dasher: 25 },

    // 46-50
    46: { standard: 40, swarm: 40, tank: 5 },
    47: { tesseract: 40, ghost: 20 },
    48: { dasher: 35, standard: 30, swarm: 20 },
    49: { ghost: 50, tesseract: 30, tank: 10 },
    50: { boss: 1 }
};

// Clear all enemies from the scene
function clearActiveTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];
}

// Spawns the current wave defined in WAVE_BLUEPRINTS
function executeDeploymentWave() {
    clearActiveTargets();
    let waveStr = STATE.currentWave < 10 ? `0${STATE.currentWave}` : STATE.currentWave;
    document.getElementById('hud-wave').innerText = `WAVE ${waveStr}`;
    document.getElementById('hud-wave').style.color = "#00f2ff";

    const blueprint = WAVE_BLUEPRINTS[STATE.currentWave];
    if (!blueprint) return;

    // Hard Mode Multiplier
    const multiplier = STATE.isHardMode ? 2 : 1;

    Object.keys(blueprint).forEach(type => {
        let count = blueprint[type];
        // Don't multiply boss types
        if (type !== 'boss' && type !== 'miniboss' && type !== 'normalboss') {
            count *= multiplier;
        }
        for (let i = 0; i < count; i++) {
            spawnEnemyObject(type);
        }
    });

    if (AUDIO.initialized) AUDIO.poly.triggerAttackRelease(["C4", "E4", "G4"], "4n");
}

function spawnEnemyObject(type) {
    let mesh, data = { type: type, health: 1, driftSpeed: 0.15 + (STATE.currentWave * 0.015), offset: Math.random() * Math.PI * 2, isBoss: false };

    if (type === 'standard') {
        mesh = generateVectorGeometry(getHexColor(0xff003c), 3.5, 4);
    }
    else if (type === 'dasher') {
        mesh = generateVectorGeometry(getHexColor(0x00f2ff), 3.0, 5);
        data.driftSpeed *= 1.3;
    }
    else if (type === 'ghost') {
        mesh = generateVectorGeometry(getHexColor(0xffff00), 4.0, 3);
        data.driftSpeed *= 1.2;
    }
    else if (type === 'swarm') {
        mesh = generateVectorGeometry(getHexColor(0xff00ff), 1.4, 4);
        data.driftSpeed *= 1.8;
    }
    else if (type === 'tank') {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(7.0, 10.0, 4), new THREE.MeshBasicMaterial({ color: getHexColor(0x8a2be2), wireframe: true }));
        data.health = 4; data.driftSpeed *= 0.5;
    }
    else if (type === 'tesseract') {
        mesh = new THREE.Group();
        const outerCube = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 4.5), new THREE.MeshBasicMaterial({ color: getHexColor(0xff7f00), wireframe: true }));
        const innerCube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshBasicMaterial({ color: getHexColor(0xff7f00), wireframe: true }));
        outerCube.name = "outer"; innerCube.name = "inner";
        mesh.add(outerCube, innerCube);

        data.health = 2;
        data.dimensionTimer = Math.random() * 3.0;
        data.isPhasedOut = false;
    }
    else if (type === 'miniboss') {
        data.isBoss = true; data.health = 20; data.driftSpeed = 0.18; data.shieldOn = false; data.shieldTicks = 0.0;
        mesh = new THREE.Group();
        mesh.add(new THREE.Mesh(new THREE.OctahedronGeometry(8, 0), new THREE.MeshBasicMaterial({ color: getHexColor(0x00ff66), wireframe: true })));
    }
    else if (type === 'normalboss') {
        data.isBoss = true; data.health = 35; data.driftSpeed = 0.15; data.shieldOn = true; data.shieldTicks = 0.0;
        mesh = new THREE.Group();
        mesh.add(new THREE.Mesh(new THREE.DodecahedronGeometry(10, 0), new THREE.MeshBasicMaterial({ color: getHexColor(0xff00ff), wireframe: true })));
        const shield = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 16), new THREE.MeshBasicMaterial({ color: getHexColor(0x00f2ff), wireframe: true, transparent: true, opacity: 0.65 }));
        mesh.add(shield);
    }
    else if (type === 'boss') {
        data.isBoss = true; data.health = 50; data.driftSpeed = 0.12; data.shieldOn = true; data.shieldTicks = 0.0;
        mesh = new THREE.Group();
        mesh.add(new THREE.Mesh(new THREE.IcosahedronGeometry(12, 1), new THREE.MeshBasicMaterial({ color: getHexColor(0xff003c), wireframe: true })));
        const shield = new THREE.Mesh(new THREE.SphereGeometry(17, 16, 16), new THREE.MeshBasicMaterial({ color: getHexColor(0x00f2ff), wireframe: true, transparent: true, opacity: 0.65 }));
        mesh.add(shield);
    }

    let angle = Math.random() * Math.PI * 2;
    // Hard Mode maps spawn exactly on opposite angles to mirror gameplay spawns relative to center
    if (STATE.isHardMode) {
        angle = angle + Math.PI;
    }

    const radius = data.isBoss ? 160 : 90 + Math.random() * 85;
    mesh.position.set(Math.cos(angle) * radius, 2.0 + Math.random() * 12, Math.sin(angle) * radius);
    mesh.userData = data;

    targets.push(mesh);
    scene.add(mesh);
}

// Geometric construction function for enemies
function generateVectorGeometry(hexColor, radius, detail) {
    const geo = new THREE.PolyhedronGeometry(
        [ -1,-1,-1,  1,-1,-1,  1, 1,-1, -1, 1,-1, -1,-1, 1,  1,-1, 1,  1, 1, 1, -1, 1, 1 ],
        [ 2,1,0, 0,3,2, 0,4,7, 7,3,0, 0,1,5, 5,4,0, 1,2,6, 6,5,1, 2,3,7, 7,6,2, 4,5,6, 6,7,4 ],
        radius, detail % 3
    );
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hexColor, wireframe: true }));
}

function spawnVictoryToken() {
    const coinGeo = new THREE.CylinderGeometry(5, 5, 1, 6);
    const coinMat = new THREE.MeshBasicMaterial({ color: getHexColor(0xffd700), wireframe: true });
    activeCoin = new THREE.Mesh(coinGeo, coinMat);
    activeCoin.rotation.x = Math.PI / 2;

    // Mirror position for hard mode
    let posZ = -30;
    if (STATE.isHardMode) posZ = 30;

    activeCoin.position.set(0, 3.0, posZ);
    scene.add(activeCoin);

    document.getElementById('hud-wave').innerText = "COIN READY";
    document.getElementById('hud-wave').style.color = "#ffd700";
    if (AUDIO.initialized) AUDIO.poly.triggerAttackRelease(["E4", "A4", "E5"], "2n");
}
