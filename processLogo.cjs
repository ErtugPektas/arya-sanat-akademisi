const sharp = require('sharp');

async function process() {
  // Trim transparent space from the transparent logo
  const trimmed = await sharp('public/assets/logo.png').trim().toBuffer();
  
  // Save trimmed version for navbar
  await sharp(trimmed).toFile('public/assets/logo-trimmed.png');

  // Create a 256x256 white circle for favicon
  const circleSvg = Buffer.from('<svg width="256" height="256"><circle cx="128" cy="128" r="128" fill="white"/></svg>');
  
  // Composite trimmed logo onto the white circle (scaled down to fit)
  const logoResized = await sharp(trimmed).resize({ width: 220, height: 220, fit: 'inside' }).toBuffer();
  
  await sharp(circleSvg)
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toFile('public/favicon.png');
    
  console.log('Done processing images');
}
process().catch(console.error);
