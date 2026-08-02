import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const directoryPath = path.join(process.cwd(), 'public', 'assets');

async function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      await processDirectory(fullPath);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > 200 * 1024) { // Only compress if > 200KB
            console.log(`Compressing ${fullPath} (${(stats.size/1024).toFixed(1)} KB)`);
            const tempPath = fullPath + '.tmp';
            await sharp(fullPath)
              .resize({ width: 800, withoutEnlargement: true })
              .jpeg({ quality: 80, force: false })
              .png({ quality: 80, compressionLevel: 8, force: false })
              .toFile(tempPath);
            fs.renameSync(tempPath, fullPath);
          }
        } catch (e) {
          console.error(`Error processing ${fullPath}:`, e);
        }
      }
    }
  }
}

processDirectory(directoryPath).then(() => {
  console.log("Compression done.");
});
