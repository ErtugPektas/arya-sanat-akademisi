const fs = require('fs');
let c = fs.readFileSync('public/js/audio.js', 'utf8');

c = c.replace(/function startBackgroundMusic\(\) \{[\s\S]*?function stopBackgroundMusic\(\) \{[\s\S]*?\n  \}/, `let bgAudio = null;

  function startBackgroundMusic() {
    if (isMuted) return;
    if (!bgAudio) {
      bgAudio = new Audio('/assets/piyano.mp3');
      bgAudio.loop = true;
      bgAudio.volume = 0.4;
    }
    bgAudio.play().catch(e => console.log('Audio play blocked:', e));
  }

  function stopBackgroundMusic() {
    if (bgAudio) {
      bgAudio.pause();
    }
  }`);

fs.writeFileSync('public/js/audio.js', c);
console.log('Background music swapped to mp3');
