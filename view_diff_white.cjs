const fs = require('fs');
const lines = fs.readFileSync('src/components/customer/NewBookingPage.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('text-white')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
