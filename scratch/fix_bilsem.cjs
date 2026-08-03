const fs=require('fs');
let c=fs.readFileSync('src/content/kurslar/bilsem-hazirlik.md','utf8');
c=c.replace(/image: ""/g, 'image: "/assets/kurslar/bilsem-kurs.jpg"');
fs.writeFileSync('src/content/kurslar/bilsem-hazirlik.md', c);
console.log('Bilsem image fixed');
