import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/index.astro', 'utf8');

// We want to find: <input type="text" id="XYZ" ... /> ... <button ...>Seç 📁</button>
// And insert a clear button after the Seç button.

content = content.replace(/(<input type="text" id="([^"]+)"[^>]*>[\s\S]*?<button[^>]*>Seç 📁<\/button>)/g, (match, p1, inputId) => {
    // If it already has a clear button, don't add it again
    if (match.includes('Sil ❌')) return match;

    const clearBtn = `\n                              <button type="button" onclick="const p=document.getElementById('${inputId}'); p.value=''; p.dispatchEvent(new Event('input'))" style="background: #2a1111; color: #fca5a5; border: 1px solid #4a1515; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; margin-left: 0.25rem;">Sil ❌</button>`;
    
    return p1 + clearBtn;
});

fs.writeFileSync('src/pages/admin/index.astro', content);
console.log('Added clear buttons to admin/index.astro');
