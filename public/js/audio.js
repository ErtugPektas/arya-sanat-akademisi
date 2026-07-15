/**
 * audio.js — Arya Sanat Akademisi
 * Web Audio API ile programatik enstrüman sesleri ve arka plan piyanosu
 * Sıfır yükleme gecikmesi ve maksimum performans için tamamen programatik sentez
 */

'use strict';

const AudioManager = (() => {
  let audioCtx = null;
  let masterGainNode = null;
  let isMuted = false;
  
  let bgMusicInterval = null;
  let currentChordIndex = 0;

  // C Majör / A Minör geçişli dinlendirici piyano akorları
  const AMBIENT_CHORDS = [
    [130.81, 196.00, 261.63, 329.63, 392.00], // C3, G3, C4, E4, G4 (C Major)
    [110.00, 164.81, 220.00, 261.63, 329.63], // A2, E3, A3, C4, E4 (Am7)
    [87.31,  130.81, 174.61, 218.27, 261.63], // F2, C3, F3, A3, C4 (Fmaj7)
    [98.00,  146.83, 196.00, 246.94, 293.66]  // G2, D3, G3, B3, D4 (G Major)
  ];

  const SOUNDS = {
    piano: {
      notes: [523.25, 659.25, 783.99], // C5, E5, G5 (C majör)
      type: 'sine',
      duration: 1.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.4,
      release: 1.0,
    },
    guitar: {
      notes: [329.63, 415.30, 493.88, 659.25], // E4, Ab4, B4, E5 (arpej)
      type: 'triangle',
      duration: 1.8,
      attack: 0.005,
      decay: 0.2,
      sustain: 0.3,
      release: 1.2,
      arpeggio: true,
      arpeggioDelay: 0.07,
    },
    drums: {
      type: 'drums',
      duration: 0.8
    },
    violin: {
      notes: [659.25, 880.00], // E5, A5
      type: 'sawtooth',
      duration: 1.8,
      attack: 0.15,
      decay: 0.1,
      sustain: 0.7,
      release: 0.8,
      vibrato: true,
    }
  };

  /**
   * AudioContext ve Master Gain Node başlatıcı
   */
  function init() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
      masterGainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * Arka plan piyano akoru çalma fonksiyonu
   */
  function playBackgroundChord(notes) {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.15; // İnsansı piyano tuş arpeji
      const duration = 4.2;
      const attack = 0.8;
      const decay = 0.6;
      const sustain = 0.5;
      const release = 2.0;

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      // Yumuşak piyano hissi için lowpass filtre
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, startTime);

      osc.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(masterGainNode);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Çok hafif arka plan ses seviyesi (0.035)
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.035, startTime + attack);
      gainNode.gain.linearRampToValueAtTime(0.035 * sustain, startTime + attack + decay);
      gainNode.gain.setValueAtTime(0.035 * sustain, startTime + duration - release);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }

  /**
   * Arka plan müziği döngüsünü başlat
   */
  function startBackgroundMusic() {
    if (bgMusicInterval) return;

    // İlk akoru hemen çal
    playBackgroundChord(AMBIENT_CHORDS[currentChordIndex]);
    currentChordIndex = (currentChordIndex + 1) % AMBIENT_CHORDS.length;

    // Her 6 saniyede bir yeni akor çal
    bgMusicInterval = setInterval(() => {
      if (!isMuted && audioCtx && audioCtx.state === 'running') {
        playBackgroundChord(AMBIENT_CHORDS[currentChordIndex]);
        currentChordIndex = (currentChordIndex + 1) % AMBIENT_CHORDS.length;
      }
    }, 6000);
  }

  /**
   * Genel not çalma fonksiyonu (Efekt sesleri için)
   */
  function playNote(freq, type, startTime, duration, attack, decay, sustain, release) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const localGain = audioCtx.createGain();

    localGain.gain.value = 0.15; // Efekt sesleri genel seviyesi

    osc.connect(gain);
    gain.connect(localGain);
    localGain.connect(masterGainNode);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.setValueAtTime(sustain, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playVibratoNote(freq, startTime, duration, attack, sustain, release) {
    const osc = audioCtx.createOscillator();
    const vibratoOsc = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    const gainNode = audioCtx.createGain();
    const localGain = audioCtx.createGain();

    localGain.gain.value = 0.12;

    vibratoOsc.type = 'sine';
    vibratoOsc.frequency.value = 5.5;
    vibratoGain.gain.value = 8;

    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(gainNode);
    gainNode.connect(localGain);
    localGain.connect(masterGainNode);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attack);
    gainNode.gain.setValueAtTime(sustain, startTime + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    vibratoOsc.start(startTime);
    osc.start(startTime);
    vibratoOsc.stop(startTime + duration + 0.05);
    osc.stop(startTime + duration + 0.05);
  }

  function playKick(startTime) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.3);

    gain.gain.setValueAtTime(0.6, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

    osc.connect(gain);
    gain.connect(masterGainNode);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  function playSnare(startTime) {
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
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
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
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    noise.start(startTime);
    noise.stop(startTime + 0.06);
  }

  /**
   * Enstrüman ses efekti çal
   */
  function play(instrument) {
    if (isMuted) return;
    init();

    const now = audioCtx.currentTime;
    const recipe = SOUNDS[instrument];
    if (!recipe) return;

    if (instrument === 'drums') {
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
        playVibratoNote(freq, now + i * 0.5, recipe.duration, recipe.attack, recipe.sustain, recipe.release);
      });
      return;
    }

    if (recipe.arpeggio) {
      recipe.notes.forEach((freq, i) => {
        playNote(freq, recipe.type, now + i * recipe.arpeggioDelay, recipe.duration, recipe.attack, recipe.decay, recipe.sustain, recipe.release);
      });
    } else {
      recipe.notes.forEach(freq => {
        playNote(freq, recipe.type, now, recipe.duration, recipe.attack, recipe.decay, recipe.sustain, recipe.release);
      });
    }
  }

  /**
   * Sesi aç / kapat (Master Gain üzerinden)
   */
  function toggleMute() {
    isMuted = !isMuted;
    init();

    const now = audioCtx.currentTime;
    if (isMuted) {
      // Sesi yumuşakça sıfırla (tıkırtı engelleme)
      masterGainNode.gain.setTargetAtTime(0, now, 0.08);
    } else {
      // Sesi yumuşakça aç
      masterGainNode.gain.setTargetAtTime(1, now, 0.08);
      startBackgroundMusic();
    }
    return isMuted;
  }

  function getMuted() { return isMuted; }

  // İlk etkileşimde ses sistemini uyandır ve arka plan müziğini başlat
  const handleUserInteraction = () => {
    init();
    if (audioCtx && audioCtx.state === 'running') {
      startBackgroundMusic();
      // Dinleyicileri temizle
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    }
  };

  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);

  return { play, toggleMute, getMuted, init };
})();

window.AudioManager = AudioManager;
