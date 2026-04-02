// ============================================================
// AUDIO.JS - Web Audio API Synthetic Sound Effects
// No external files required! Generates retro synthwave SFX
// ============================================================

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.musicPlaying = false;
        
        // Listen for first interaction to unlock AudioContext
        window.addEventListener('click', () => this.init(), { once: true });
        window.addEventListener('keydown', () => this.init(), { once: true });
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _playTone(type, startFreq, endFreq, duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        if (endFreq) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playJump() {
        this._playTone('triangle', 300, 500, 0.1, 0.05); // quick snappy jump
    }

    playPickup() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        // Classic coin pickup sound (two quick high notes)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
        
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playPowerup() {
        this._playTone('sawtooth', 200, 800, 0.5, 0.05);
    }

    playHurt() {
        // Heavy bass drop for taking damage
        this._playTone('sawtooth', 200, 40, 0.3, 0.15);
    }

    playLand() {
        // Heavy thud when falling from height
        this._playTone('square', 80, 20, 0.15, 0.1);
    }

    playGrapple() {
        this._playTone('triangle', 600, 200, 0.1, 0.05);
    }

    playUI() {
        this._playTone('square', 800, 800, 0.05, 0.03);
    }

    playHackBeep() {
        this._playTone('sine', 1200, 1200, 0.05, 0.02);
    }

    playHackSuccess() {
        this._playTone('square', 800, 1600, 0.4, 0.1);
    }

    playHackFail() {
        this._playTone('sawtooth', 150, 90, 0.6, 0.2); // Angry buzz
    }

    playDoorSlide() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        // Deep rumbling earthquake tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 3.0);
        
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 4.0);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 4.0);
    }

    playKlaxon() {
        // Warning Siren
        this._playTone('sawtooth', 600, 300, 0.8, 0.2);
        setTimeout(() => this._playTone('sawtooth', 600, 300, 0.8, 0.2), 800);
        setTimeout(() => this._playTone('sawtooth', 600, 300, 0.8, 0.2), 1600);
    }

    // --- PROCEDURAL SYNTHWAVE MUSIC GENERATOR ---
    startMusic() {
        if (!this.enabled || !this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        
        let tempo = 125; // Driving cyberpunk tempo
        let step = 0;
        let nextNoteTime = this.ctx.currentTime + 0.1;

        const loop = () => {
            if (!this.musicPlaying) return;
            while (nextNoteTime < this.ctx.currentTime + 0.1) {
                // Cyberpunk Bassline (16 steps - MIDI Notes)
                const bassNotes = [36, 0, 36, 36,  39, 0, 39, 41,  36, 0, 36, 36,  43, 0, 41, 0];
                // Arpeggiator Melody (16 steps)
                const arpNotes = [60, 63, 67, 60,  68, 67, 63, 67,  60, 63, 67, 60,  72, 70, 67, 63];

                // 1. Kick Drum (4-on-the-floor)
                if (step % 4 === 0) {
                    this._playTone('sine', 150, 40, 0.5, 0.15); // Deep thumping kick
                }
                
                // 2. Snare / Clap (on beats 2 and 4, which is step 4 and 12)
                if (step === 4 || step === 12) {
                    this._playTone('square', 300, 100, 0.1, 0.05); // Snap
                    this._playTone('sawtooth', 800, 200, 0.1, 0.02); // Noise layer
                }

                // 3. Bass Synth
                if (bassNotes[step] > 0) {
                    const bFreq = 440 * Math.pow(2, (bassNotes[step] - 69) / 12);
                    this._playTone('sawtooth', bFreq, bFreq * 0.5, 0.2, 0.05);
                }

                // 4. Arp Lead Line 
                if (step % 2 === 0 || Math.random() > 0.5) { // slightly randomized groove
                    const aFreq = 440 * Math.pow(2, (arpNotes[step] - 69) / 12);
                    this._playTone('square', aFreq, aFreq, 0.1, 0.015);
                }

                // Advance sequencer
                nextNoteTime += (60 / tempo) / 4; // 16th notes
                step = (step + 1) % 16;
            }
            this.musicTimer = setTimeout(loop, 25);
        };
        loop();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) clearTimeout(this.musicTimer);
    }
}

const sfx = new AudioSystem();
// Global singleton export
window.sfx = sfx;
