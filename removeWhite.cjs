const sharp = require('sharp');
sharp('public/assets/logo.png')
  .toColorspace('srgb')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 240 && g > 240 && b > 240) {
        data[i+3] = 0; // Make transparent
      }
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile('public/assets/logo-transparent.png');
  })
  .then(() => console.log('Done'))
  .catch(console.error);

