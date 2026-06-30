const fs = require('fs');
const path = require('path');

let count = 0;
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/\btext-white\b/g);
      if (matches) {
        count += matches.length;
      }
    }
  }
}

walk('./src');
console.log('Total text-white:', count);
