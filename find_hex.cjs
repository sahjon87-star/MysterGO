const fs = require('fs');
const path = require('path');

function findHexColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findHexColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g);
      if (matches) {
        // filter out valid exceptions
        const ignoreList = ['src/components/shared/Logo.tsx', 'src/components/shared/TrackingMap.tsx', 'src/components/auth/SignupPage.tsx', 'src/components/customer/NewBookingPage.tsx'];
        if (!ignoreList.some(i => fullPath.endsWith(i))) {
          console.log(`${fullPath}: ${[...new Set(matches)].join(', ')}`);
        }
      }
    }
  }
}

findHexColors('./src');
