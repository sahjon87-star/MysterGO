const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content.replace(/hover:text-white/g, (match, offset, string) => {
    let startQuote1 = string.lastIndexOf('"', offset);
    let startQuote2 = string.lastIndexOf("'", offset);
    let startQuote3 = string.lastIndexOf('`', offset);
    let startQuote = Math.max(startQuote1, startQuote2, startQuote3);
    
    let endQuote1 = string.indexOf('"', offset);
    let endQuote2 = string.indexOf("'", offset);
    let endQuote3 = string.indexOf('`', offset);
    let endQuotes = [endQuote1, endQuote2, endQuote3].filter(q => q > -1);
    let endQuote = endQuotes.length > 0 ? Math.min(...endQuotes) : -1;

    if (startQuote === -1 || endQuote === -1) return 'hover:text-cream';
    
    let classStr = string.substring(startQuote, endQuote);
    if (classStr.match(/bg-(brand-blue|brand-amber|blue-|amber-|green-|red-|indigo-|black)/)) {
      return 'hover:text-white';
    }
    
    return 'hover:text-cream';
  });

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
