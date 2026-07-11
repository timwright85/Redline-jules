// ==========================================
// AUDIO ENGINE (TONE.JS)
// ==========================================

// Initialize the audio components only when the player interacts with the game
function initAudioEngine() {
    if (AUDIO.initialized) return;

    // Filter to add a lowpass effect to all game audio to give it a slightly muffled, distant feel initially
    AUDIO.filter = new Tone.Filter({ type: "lowpass", frequency: 22000, Q: 1 }).toDestination();

    // Synth for general hit effects, enemy damage, and standard interactions
    AUDIO.synth = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        filter: { Q: 2, type: "lowpass", frequency: 800 },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.12 },
        filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, baseFrequency: 300, octaves: 2.5 }
    }).connect(AUDIO.filter);
    AUDIO.synth.volume.value = -6;

    // Poly synth for musical chords, typically used when waves start or events trigger
    AUDIO.poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.1 }
    }).connect(AUDIO.filter);
    AUDIO.poly.volume.value = -14;

    // Noise synth to act as a percussive element, such as weapon discharges and dash abilities
    AUDIO.noise = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.002, decay: 0.18, sustain: 0 }
    }).connect(AUDIO.filter);
    AUDIO.noise.volume.value = -4;

    // Background low frequency oscillator for a subtle drone/ambience
    AUDIO.bass = new Tone.Oscillator(55, "sawtooth").connect(AUDIO.filter);
    AUDIO.bass.volume.value = -18;

    AUDIO.initialized = true;
}
