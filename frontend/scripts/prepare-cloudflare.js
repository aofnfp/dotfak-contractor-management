#!/usr/bin/env node

/**
 * Prepare build output for Cloudflare Pages deployment
 * Copies .next directory excluding cache files that exceed 25MB limit
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '.next');
const targetDir = path.join(__dirname, '..', '.next-cloudflare');

// Directories to exclude (cache files that exceed Cloudflare's 25MB limit)
const excludeDirs = ['cache'];

function copyRecursive(src, dest) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      console.log(`Skipping: ${entry.name}/`);
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively copy directories
      copyRecursive(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Preparing build for Cloudflare Pages...');

  // Remove target directory if exists
  if (fs.existsSync(targetDir)) {
    console.log('Removing previous build...');
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy .next to .next-cloudflare excluding cache
  console.log('Copying build output...');
  copyRecursive(sourceDir, targetDir);

  console.log('✓ Build prepared successfully!');
  console.log(`Output directory: ${path.relative(path.join(__dirname, '..'), targetDir)}`);
} catch (error) {
  console.error('Error preparing build:', error);
  process.exit(1);
}
