#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcApiPath = path.join(__dirname, '..', 'src', 'app', 'api');
const tempApiPath = path.join(__dirname, '..', 'api-temp');

function moveDirectory(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
  }
}

try {
  // Move API folder out temporarily (Next.js static export doesn't support API routes)
  moveDirectory(srcApiPath, tempApiPath);

  // Build Next.js
  console.log('Building Next.js...');
  execSync('npm run build', { stdio: 'inherit' });

  // Move API folder back
  moveDirectory(tempApiPath, srcApiPath);

  console.log('Build completed successfully!');
} catch (error) {
  // Ensure we move the API folder back even if build fails
  if (fs.existsSync(tempApiPath)) {
    moveDirectory(tempApiPath, srcApiPath);
  }
  console.error('Build failed:', error.message);
  process.exit(1);
}
