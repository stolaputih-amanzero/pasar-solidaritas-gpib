const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function getSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const radius = isMaskable ? 0 : size * 0.22;
  const half = size / 2;
  const wArm = size * 0.04;
  const hArm = size * 0.22;
  const armCross = size * 0.16;
  const crossY = -size * 0.04;
  const goldAura = size * 0.28;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1c4c37" />
        <stop offset="100%" stop-color="#0f2b1f" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f5d77f" />
        <stop offset="100%" stop-color="#d4a338" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />
    
    <!-- Subtle Inner Border -->
    <rect x="${padding * 0.4}" y="${padding * 0.4}" width="${size - padding * 0.8}" height="${size - padding * 0.8}" rx="${radius * 0.8}" fill="none" stroke="#e8c468" stroke-width="${size * 0.015}" opacity="0.4" />

    <!-- Center Emblem (Stylized Solidaritas GPIB Cross & Golden Leaves) -->
    <g transform="translate(${half}, ${half})">
      <!-- Outer radiant aura -->
      <circle r="${goldAura}" fill="none" stroke="#e8c468" stroke-width="${size * 0.018}" stroke-dasharray="${size * 0.04} ${size * 0.025}" opacity="0.3" />
      
      <!-- Cross Core (Clean White Solidaritas Cross) -->
      <rect x="${-wArm}" y="${-hArm}" width="${wArm * 2}" height="${hArm * 2}" rx="${size * 0.01}" fill="#ffffff" />
      <rect x="${-armCross}" y="${crossY - wArm}" width="${armCross * 2}" height="${wArm * 2}" rx="${size * 0.01}" fill="#ffffff" />

      <!-- Golden Wheat / Sprout of Community Solidarity -->
      <path d="M 0, ${size * 0.18} Q ${size * 0.16}, ${size * 0.10} ${size * 0.15}, ${-size * 0.02} Q ${size * 0.10}, ${size * 0.07} 0, ${size * 0.11} Z" fill="url(#goldGrad)" opacity="0.95" />
      <path d="M 0, ${size * 0.18} Q ${-size * 0.16}, ${size * 0.10} ${-size * 0.15}, ${-size * 0.02} Q ${-size * 0.10}, ${size * 0.07} 0, ${size * 0.11} Z" fill="url(#goldGrad)" opacity="0.95" />

      <!-- Center Gold Accent Jewel -->
      <circle cx="0" cy="${crossY}" r="${size * 0.025}" fill="url(#goldGrad)" />
    </g>
  </svg>
  `;
}

async function buildIcons() {
  const configs = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const c of configs) {
    const svg = Buffer.from(getSvg(c.size, c.maskable));
    const target = path.join(dir, c.name);
    await sharp(svg).png().toFile(target);
    console.log('Created:', target);
  }

  // Also create favicon.png and icon.png in public/
  const favSvg = Buffer.from(getSvg(64, false));
  await sharp(favSvg).png().toFile(path.join(process.cwd(), 'public', 'favicon.png'));
  console.log('Created public/favicon.png');

  const mainIconSvg = Buffer.from(getSvg(192, false));
  await sharp(mainIconSvg).png().toFile(path.join(process.cwd(), 'public', 'icon.png'));
  console.log('Created public/icon.png');
}

buildIcons();
