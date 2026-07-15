/**
 * audio.js — Arya Sanat Akademisi
 * Ludovico Einaudi tarzında (Nuvole Bianche akışında) aralıksız çalan dinlendirici piyano sentezi.
 * Sıfır yükleme gecikmesi ve Edge CDN tasarrufu için tamamen Web Audio API ile üretilmiştir.
 * Bu sürümde, piyano seslerine kilise akustiği (reverb/delay) katan programatik bir geciktirici eklenmiştir.
 */

'use strict';

const AudioManager = (() => {
  let audioCtx = null;
  let masterGainNode = null;
  let delayNode = null;
  let delayFeedback = null;
  let delayWet = null;
  let isMuted = false;
  
  let schedulerTimer = null;
  let nextNoteTime = 0.0;
  let currentNoteIndex = 0;
  let currentChordIndex = 0;
  
  const noteLength = 0.18; // 180ms aralıklarla sekizlik notalar (akıcı arpej)

  // Ludovico Einaudi tarzında (Am - F - C - G) akan piyano akor arpejleri
  const CHORDS = [
    [110.00, 164.81, 220.00, 261.63, 329.63, 261.63, 220.00, 164.81], // Am: A2, E3, A3, C4, E4, C4, A3, E3
    [87.31,  130.81, 174.61, 218.27, 261.63, 218.27, 174.61, 130.81], // F: F2, C3, F3, A3, C4, A3, F3, C3
    [130.81, 196.00, 261.63, 329.63, 392.00, 329.63, 261.63, 196.00], // C: C3, G3, C4, E4, G4, E4, C4, G3
    [98.00,  146.83, 196.00, 246.94, 293.66, 246.94, 196.00, 146.83]  // G: G2, D3, G3, B3, D4, B3, G3, D3
  ];

  // Sağ el melodi notaları (akorların 0. ve 4. vuruşlarında devreye girer)
  const MELODY_BEAT_0 = [659.25, 698.46, 783.99, 587.33 * 2]; // E5, F5, G5, D6
  const MELODY_BEAT_4 = [523.25, 523.25, 659.25, 493.88];     // C5, C5, E5, B4

  const EFFECT_SOUNDS = {
    piano: {
      notes: [523.25, 659.25, 783.99],
      type: 'sine',
      duration: 1.2,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.4,
      release: 0.8,
    },
    guitar: {
      notes: [329.63, 415.30, 493.88, 659.25],
      type: 'triangle',
      duration: 1.5,
      attack: 0.005,
      decay: 0.15,
      sustain: 0.3,
      release: 1.0,
      arpeggio: true,
      arpeggioDelay: 0.06,
    },
    drums: {
      type: 'drums',
      duration: 0.8
    },
    violin: {
      notes: [659.25, 880.00],
      type: 'sawtooth',
      duration: 1.5,
      attack: 0.1,
      decay: 0.1,
      sustain: 0.6,
      release: 0.7,
      vibrato: true,
    }
  };

  /**
   * AudioContext, Master Gain ve Reverb (Delay) Efekti başlatıcı
   */
  function init() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master Gain
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
      masterGainNode.connect(audioCtx.destination);

      // Reverb/Echo Efekti için Gecikme Ünitesi (Delay Node)
      delayNode = audioCtx.createDelay(2.0);
      delayNode.delayTime.setValueAtTime(0.38, audioCtx.currentTime); // 380ms gecikme (yankı)

      delayFeedback = audioCtx.createGain();
      delayFeedback.gain.setValueAtTime(0.42, audioCtx.currentTime); // Yankı kuyruğu uzunluğu (reverb hissi)

      delayWet = audioCtx.createGain();
      delayWet.gain.setValueAtTime(0.22, audioCtx.currentTime); // Efektin genel ses miksajı oranı

      // Yankı Geri Besleme Döngüsü (Feedback loop)
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);

      // Efekti Master Çıkışa bağla
      delayNode.connect(delayWet);
      delayWet.connect(masterGainNode);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * Yumuşak hisli felt-piano tuş sesi üretir
   */
  function playPianoTone(freq, startTime, duration, volume, attack, decay, release) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Dinlendirici lo-fi piyano tonu için lowpass filtre
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, startTime);

    osc.connect(gainNode);
    gainNode.connect(filter);
    
    // Filtrelenmiş sesi doğrudan masterGain'e (kuru ses) bağla
    filter.connect(masterGainNode);
    // Aynı zamanda filtrelenmiş sesi yankı ünitesine (ıslak ses) göndererek derinlik ekle
    filter.connect(delayNode);

    osc.type = 'sine'; // Yuvarlak ve pürüzsüz dalga formu
    osc.frequency.setValueAtTime(freq, startTime);

    // ADSR ses zarfı (Tıkırtıyı önlemek için hafif attack ve uzun sönümleme)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + attack + decay);
    gainNode.gain.setValueAtTime(volume * 0.4, startTime + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  /**
   * Audio zamanlaması için nota planlayıcı
   */
  function scheduleNote(noteIndex, chordIndex, time) {
    // Sol el eşlik arpeji (Çok derinden ve hafif: 0.012 ses seviyesi)
    const baseFreq = CHORDS[chordIndex][noteIndex];
    playPianoTone(baseFreq, time, 0.45, 0.012, 0.15, 0.3, 0.4);

    // Sağ el melodi notası (Bir tık daha belirgin ama yine de dinlendirici: 0.015 ses seviyesi)
    if (noteIndex === 0) {
      const melodyFreq = MELODY_BEAT_0[chordIndex];
      playPianoTone(melodyFreq, time, 1.2, 0.015, 0.2, 0.4, 0.8);
    } else if (noteIndex === 4) {
      const melodyFreq = MELODY_BEAT_4[chordIndex];
      playPianoTone(melodyFreq, time, 1.2, 0.015, 0.2, 0.4, 0.8);
    }
  }

  function nextNote() {
    currentNoteIndex++;
    if (currentNoteIndex >= 8) {
      currentNoteIndex = 0;
      currentChordIndex = (currentChordIndex + 1) % CHORDS.length;
    }
    nextNoteTime += noteLength;
  }

  function scheduler() {
    // Bir sonraki notayı zamanında planlamak için 100ms önceden bakar
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
      scheduleNote(currentNoteIndex, currentChordIndex, nextNoteTime);
      nextNote();
    }
  }

  /**
   * Sürekli akan dinlendirici piyano müziğini başlat
   */
  function startBackgroundMusic() {
    init();
    if (schedulerTimer || isMuted) return;

    nextNoteTime = audioCtx.currentTime + 0.05;
    currentNoteIndex = 0;
    currentChordIndex = 0;

    // Planlayıcıyı 25ms aralıklarla çalıştırarak kesintisiz döngü oluştur
    schedulerTimer = setInterval(scheduler, 25);
  }

  function stopBackgroundMusic() {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  }

  /**
   * Not oynatma (sine/triangle/sawtooth) — Kart efektleri için
   */
  function playEffectNote(freq, type, startTime, duration, attack, decay, sustain, release) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const localGain = audioCtx.createGain();

    localGain.gain.value = 0.12; // Kart tıklandığında çalacak efekt seviyesi

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

    localGain.gain.value = 0.08;

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

    gain.gain.setValueAtTime(0.5, startTime);
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
    gain.gain.setValueAtTime(0.25, startTime);
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
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    noise.start(startTime);
    noise.stop(startTime + 0.06);
  }

  /**
   * Enstrüman ses efekti çal (Kartların üzerine gelince)
   */
  function play(instrument) {
    if (isMuted) return;
    init();

    const now = audioCtx.currentTime;
    const recipe = EFFECT_SOUNDS[instrument];
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
        playEffectNote(freq, recipe.type, now + i * recipe.arpeggioDelay, recipe.duration, recipe.attack, recipe.decay, recipe.sustain, recipe.release);
      });
    } else {
      recipe.notes.forEach(freq => {
        playEffectNote(freq, recipe.type, now, recipe.duration, recipe.attack, recipe.decay, recipe.sustain, recipe.release);
      });
    }
  }

  /**
   * Sesi aç / kapat
   */
  function toggleMute() {
    isMuted = !isMuted;
    init();

    const now = audioCtx.currentTime;
    if (isMuted) {
      masterGainNode.gain.setTargetAtTime(0, now, 0.05);
      stopBackgroundMusic();
    } else {
      masterGainNode.gain.setTargetAtTime(1, now, 0.05);
      startBackgroundMusic();
    }
    return isMuted;
  }

  function getMuted() { return isMuted; }

  // İlk kullanıcı etkileşimiyle ses sistemini uyandır ve sürekli çalan ambient piyanoyu başlat
  const handleUserInteraction = () => {
    init();
    if (audioCtx && audioCtx.state === 'running') {
      startBackgroundMusic();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    }
  };

  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);

  return { play, toggleMute, getMuted, init };
})();

window.AudioManager = AudioManager;
