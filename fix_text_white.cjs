const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // We want to replace text-white with text-cream BUT only if there's no dark bg class nearby.
  // Actually, let's just replace text-white with text-cream, and text-slate-100 with text-cream, 
  // text-slate-200 with text-cream, text-slate-300 with text-cream, text-slate-400 with text-gray-teal.
  
  // A safer approach: The user specifically mentioned:
  // "strip out any hardcoded classes like text-black, text-slate-900, bg-black, bg-white, or raw hex codes that break the dark/light mode contrast."
  // Wait, the user said "Text must adapt correctly using our design system tokens (e.g., text-cream, text-slate-100, or text-gray-teal)."
  // So text-slate-100 is considered a token by the user? But text-slate-100 is light in both modes.
  // Wait, maybe the user wants us to replace text-white with text-cream?
  // Let's replace text-white with text-cream everywhere EXCEPT if it's on a button, badge, or has a bg- color other than bg-brand-surface/brand-slate/brand-dark.

  content = content.replace(/text-white/g, (match, offset, string) => {
    // Find the current class string
    let startQuote = string.lastIndexOf('"', offset);
    let endQuote = string.indexOf('"', offset);
    if (startQuote === -1 || endQuote === -1) return 'text-cream'; // fallback
    
    let classStr = string.substring(startQuote, endQuote);
    
    // If the class contains a dark background, keep text-white
    if (classStr.match(/bg-(brand-blue|brand-amber|blue-|amber-|green-|red-|indigo-|black)/)) {
      return 'text-white';
    }
    
    // Otherwise, it should adapt
    return 'text-cream';
  });
  
  // also text-slate-50, text-slate-100, text-slate-200, text-slate-300, text-slate-400
  content = content.replace(/text-slate-(50|100|200|300)\b/g, (match, p1, offset, string) => {
    let startQuote = string.lastIndexOf('"', offset);
    let endQuote = string.indexOf('"', offset);
    if (startQuote === -1 || endQuote === -1) return 'text-cream';
    let classStr = string.substring(startQuote, endQuote);
    if (classStr.match(/bg-(brand-blue|brand-amber|blue-|amber-|green-|red-|indigo-|black)/)) {
      return match;
    }
    return 'text-cream';
  });

  content = content.replace(/text-slate-(400|500)\b/g, 'text-gray-teal');
  
  // Also fix bg-white/something to bg-brand-slate/something or bg-brand-surface/something?
  // bg-white/5 or bg-white/10 is usually for glass effects in dark mode. If we are in light mode, bg-white/5 on white bg does nothing.
  // Let's replace bg-white/5 with bg-brand-surface and bg-white/10 with bg-brand-surface

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
