const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replacements
  content = content.replace(/\btext-black\b/g, 'text-cream');
  content = content.replace(/\btext-slate-900\b/g, 'text-cream');
  content = content.replace(/\bbg-black\b/g, 'bg-brand-dark');
  content = content.replace(/\bbg-white\b(?!\/)/g, 'bg-brand-slate');
  
  // Also text-slate-800, text-slate-700, text-gray-800, text-gray-900
  content = content.replace(/\btext-slate-800\b/g, 'text-cream');
  content = content.replace(/\btext-gray-900\b/g, 'text-cream');
  content = content.replace(/\btext-gray-800\b/g, 'text-cream');
  
  // For bg colors
  content = content.replace(/\bbg-slate-900\b/g, 'bg-brand-dark');
  content = content.replace(/\bbg-slate-800\b/g, 'bg-brand-surface');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('./src');
