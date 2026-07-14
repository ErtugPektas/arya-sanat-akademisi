/**
 * audio.js — Arya Sanat Akademisi
 * Web Audio API ile programatik enstrüman sesleri
 * Harici ses dosyası gerekmez — sıfır yükleme gecikmesi
 */

'use strict';

const AudioManager = (() => {
  let audioCtx = null;
  let isMuted = false;

  // Her enstrüman için ses tarifi
  const SOUNDS = {
    piano: {
      notes: [523.25, 659.25, 783.99], // C5, E5, G5 (C majör akor)
      type: 'sine',
      duration: 1.8,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.4,
      release: 1.2,
    },
    guitar: {
      notes: [329.63, 415.30, 493.88, 659.25], // E4, Ab4, B4, E5 (arpej)
      type: 'triangle',
      duration: 2.0,
      attack: 0.005,
      decay: 0.2,
      sustain: 0.3,
      release: 1.5,
      arpeggio: true,
      arpeggioDelay: 0.07,
    },
    drums: {
      // Kick + snare + hihat sekansı
      type: 'kick',
      duration: 0.8,
    },
    violin: {
      notes: [659.25, 880.00], // E5, A5 (keman açık telleri)
      type: 'sawtooth',
      duration: 2.0,
      attack: 0.15,
      decay: 0.1,
      sustain: 0.7,
      release: 0.8,
      vibrato: true,
    },
  };

  /**
   * AudioContext'i başlat (kullanıcı etkileşimi sonrası)
   */
  function init() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * Genel not çalma (sine/triangle/sawtooth)
   */
  function playNote(freq, type, startTime, duration, attack, decay, sustain, release) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();

    masterGain.gain.value = 0.18; // Genel ses seviyesi

    osc.connect(gain);
    gain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // ADSR Zarf
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.setValueAtTime(sustain, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Vibrato efekti (keman için)
   */
  function playVibratoNote(freq, startTime, duration, attack, sustain, release) {
    const osc = audioCtx.createOscillator();
    const vibratoOsc = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    const gainNode = audioCtx.createGain();
    const masterGain = audioCtx.createGain();

    masterGain.gain.value = 0.14;

    vibratoOsc.type = 'sine';
    vibratoOsc.frequency.value = 5.5; // 5.5 Hz vibrato
    vibratoGain.gain.value = 8;        // ±8 Hz vibrato genişliği

    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(gainNode);
    gainNode.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attack);
    gainNode.gain.setValueAtTime(sustain, startTime + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    vibratoOsc.start(startTime);
    osc.start(startTime);
    vibratoOsc.stop(startTime + duration + 0.05);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Bateri sesleri (noise-based)
   */
  function playKick(startTime) {
    // Kick drum — sinüs + pitch drop
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.3);

    gain.gain.setValueAtTime(0.8, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  function playSnare(startTime) {
    // Snare — white noise + filter
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(startTime);
    noise.stop(startTime + 0.15);
  }

  function playHihat(startTime) {
    const bufferSize = audioCtx.sampleRate * 0.05;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(startTime);
    noise.stop(startTime + 0.06);
  }

  /**
   * Enstrüman sesini çal
   * @param {string} instrument - 'piano' | 'guitar' | 'drums' | 'violin'
   */
  function play(instrument) {
    if (isMuted) return;

    init();

    const now = audioCtx.currentTime;
    const recipe = SOUNDS[instrument];
    if (!recipe) return;

    if (instrument === 'drums') {
      // Kick - Hihat - Snare - Hihat ritmi
      playKick(now);
      playHihat(now + 0.1);
      playHihat(now + 0.2);
      playSnare(now + 0.3);
      playHihat(now + 0.4);
      playKick(now + 0.5);
      playHihat(now + 0.6);
      return;
    }

    if (instrument === 'violin') {
      recipe.notes.forEach((freq, i) => {
        playVibratoNote(
          freq,
          now + i * 0.5,
          recipe.duration,
          recipe.attack,
          recipe.sustain,
          recipe.release
        );
      });
      return;
    }

    if (recipe.arpeggio) {
      recipe.notes.forEach((freq, i) => {
        playNote(
          freq,
          recipe.type,
          now + i * recipe.arpeggioDelay,
          recipe.duration,
          recipe.attack,
          recipe.decay,
          recipe.sustain,
          recipe.release
        );
      });
    } else {
      recipe.notes.forEach(freq => {
        playNote(
          freq,
          recipe.type,
          now,
          recipe.duration,
          recipe.attack,
          recipe.decay,
          recipe.sustain,
          recipe.release
        );
      });
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    return isMuted;
  }

  function getMuted() { return isMuted; }

  return { play, toggleMute, getMuted, init };
})();

// Global'e aktar
window.AudioManager = AudioManager;
