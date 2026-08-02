const fs = require('fs');
const path = require('path');

const indexAstroPath = path.join(__dirname, '../src/pages/admin/index.astro');
let indexContent = fs.readFileSync(indexAstroPath, 'utf8');

// 1. Rename edit.astro to [course].astro and update links in index.astro
// Replace `<a href={`/admin/edit?course=${course.id}`}` with `<a href={`/admin/edit/${course.id}`}`
indexContent = indexContent.replace(
  /href=\{`\/admin\/edit\?course=\$\{course\.id\}`\}/g,
  'href={`/admin/edit/${course.id}`}'
);

const oldEditPath = path.join(__dirname, '../src/pages/admin/edit.astro');
const editDir = path.join(__dirname, '../src/pages/admin/edit');
if (fs.existsSync(oldEditPath)) {
  if (!fs.existsSync(editDir)) {
    fs.mkdirSync(editDir, { recursive: true });
  }
  let editContent = fs.readFileSync(oldEditPath, 'utf8');
  // Update Astro.url.searchParams.get('course') to Astro.params.course
  editContent = editContent.replace(
    /Astro\.url\.searchParams\.get\('course'\)/g,
    'Astro.params.course'
  );
  fs.writeFileSync(path.join(editDir, '[course].astro'), editContent, 'utf8');
  fs.unlinkSync(oldEditPath);
  console.log('Renamed edit.astro to edit/[course].astro');
}

// 2. Add "Sil" buttons everywhere
// We will replace `<button ...>Seç 📁</button>` with `<button ...>Seç 📁</button><button type="button" onclick="const p=this.previousElementSibling.previousElementSibling; p.value=''; p.dispatchEvent(new Event('input'))" style="background: #2a1111; color: #fca5a5; border: 1px solid #4a1515; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; margin-left: 0.25rem;">Sil ❌</button>`
// But ONLY if it's not already there.

const silButton = `<button type="button" onclick="const p=this.previousElementSibling.previousElementSibling; p.value=''; p.dispatchEvent(new Event('input'))" style="background: #2a1111; color: #fca5a5; border: 1px solid #4a1515; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; margin-left: 0.25rem;">Sil ❌</button>`;

function addSilButton(text, targetText) {
  // Regex to match the button, ensuring we don't duplicate
  const regex = new RegExp(`(<button[^>]*>${targetText}</button>)(?!\\s*<button[^>]*>Sil ❌</button>)`, 'g');
  return text.replace(regex, `$1\n${silButton}`);
}

indexContent = addSilButton(indexContent, 'Seç 📁');
indexContent = addSilButton(indexContent, 'Görsel Yükle 📁');
indexContent = addSilButton(indexContent, 'Video Yükle 📁');

// Do the same for [course].astro
if (fs.existsSync(path.join(editDir, '[course].astro'))) {
  let editContent = fs.readFileSync(path.join(editDir, '[course].astro'), 'utf8');
  editContent = addSilButton(editContent, 'Seç 📁');
  editContent = addSilButton(editContent, 'Görsel Yükle 📁');
  editContent = addSilButton(editContent, 'Video Yükle 📁');
  fs.writeFileSync(path.join(editDir, '[course].astro'), editContent, 'utf8');
  console.log('Added Sil buttons to [course].astro');
}

// 3. Fix syncInputsFromCache by adding try/catch around each section
// We'll replace the comments `// Populate SEO`, `// Populate Why Us`, etc. with try/catch
const sections = [
  { start: '// Populate SEO', end: '// Populate Contact' },
  { start: '// Populate Contact', end: '// Populate Stats' },
  { start: '// Populate Stats', end: '// Populate Hero' },
  { start: '// Populate Hero', end: '// Populate Why Us' },
  { start: '// Populate Why Us', end: '// Populate Teachers' },
  { start: '// Populate Teachers Header & List', end: '// Populate Navbar' },
  { start: '// Populate Navbar links', end: '// Populate Gallery' },
  { start: '// Populate Gallery Header & List', end: '}' } // End of function
];

// Instead of string replacing which is flaky, let's just do a big replace on the whole function
// Wait, an easier way is to just let the gallery save issue be fixed by ensuring it works.
// Actually, why did gallery fail? Let's check if the indexContent has any other bugs.
// Let's just wrap the individual blocks manually.
indexContent = indexContent.replace(
  /(\/\/ Populate SEO[\s\S]*?)(\/\/ Populate Contact)/,
  `try { $1 } catch (e) { console.error('Error syncing SEO:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Contact[\s\S]*?)(\/\/ Populate Stats)/,
  `try { $1 } catch (e) { console.error('Error syncing Contact:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Stats[\s\S]*?)(\/\/ Populate Hero)/,
  `try { $1 } catch (e) { console.error('Error syncing Stats:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Hero[\s\S]*?)(\/\/ Populate Why Us)/,
  `try { $1 } catch (e) { console.error('Error syncing Hero:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Why Us[\s\S]*?)(\/\/ Populate Teachers Header & List)/,
  `try { $1 } catch (e) { console.error('Error syncing WhyUs:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Teachers Header & List[\s\S]*?)(\/\/ Populate Navbar links)/,
  `try { $1 } catch (e) { console.error('Error syncing Teachers:', e); }\n      $2`
);
indexContent = indexContent.replace(
  /(\/\/ Populate Navbar links[\s\S]*?)(\/\/ Populate Gallery Header & List)/,
  `try { $1 } catch (e) { console.error('Error syncing Navbar:', e); }\n      $2`
);
// For Gallery, replace until the end of the try block
indexContent = indexContent.replace(
  /(\/\/ Populate Gallery Header & List[\s\S]*?\n\s{6}\})\n\s{4}\}\n\s{4}catch \(e\)/,
  `try { $1 } catch (e) { console.error('Error syncing Gallery:', e); }\n    }\n    catch (e)`
);

fs.writeFileSync(indexAstroPath, indexContent, 'utf8');
console.log('Fixed admin/index.astro');
