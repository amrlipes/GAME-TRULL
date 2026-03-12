/**
 * GAME TRULL Audio Engine
 * Provides dynamic electronic music using Web Audio API
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.bpm = 124;
        this.lookahead = 25.0; // How far ahead to schedule audio (ms)
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.timerID = null;

        // Sequence definitions
        this.kickPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
        this.snarePattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
        this.hatPattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
        this.bassPattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

        // Bass frequencies (F minor ish vibe)
        this.bassNotes = [
            43.65, // F1
            43.65,
            51.91, // G#1
            48.99, // G1
            43.65,
            43.65,
            38.89, // Eb1
            41.20  // E1
        ];
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + 0.2);

        // Add a "snap" with an oscillator
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, time);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playHat(time) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(10000, time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    playBass(time, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(1000, time + 0.1);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    nextStep() {
        const secondsPerStep = 60.0 / this.bpm / 4.0;
        this.nextNoteTime += secondsPerStep;
        this.currentStep++;
        if (this.currentStep === 16) {
            this.currentStep = 0;
        }
    }

    scheduleStep(step, time) {
        if (this.kickPattern[step]) this.playKick(time);
        if (this.snarePattern[step]) this.playSnare(time);
        if (this.hatPattern[step]) this.playHat(time);

        // Bass on off-beats or specific pattern
        if (step % 2 === 1) {
            const noteIndex = Math.floor(step / 2) % this.bassNotes.length;
            this.playBass(time, this.bassNotes[noteIndex]);
        }

        // Lead synth (simple arpeggio)
        if (step % 4 === 0) {
            this.playLead(time, this.bassNotes[Math.floor(step / 4)] * 4);
        }
    }

    playLead(time, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHit() {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    playWin() {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + i * 0.1);
            gain.gain.setValueAtTime(0.2, time + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time + i * 0.1);
            osc.stop(time + i * 0.1 + 0.3);
        });
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextNoteTime);
            this.nextStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    start() {
        if (this.isPlaying) return;
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }
}

const gameAudio = new AudioEngine();
window.gameAudio = gameAudio;
