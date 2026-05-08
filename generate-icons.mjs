import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icon.svg');

// Generate PWA icons
await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');

// Generate favicon
await sharp(svg).resize(32, 32).png().toFile('public/favicon.png');

// Generate apple-touch-icon
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');

console.log('Icons generated: 192px, 512px, 32px favicon, 180px apple-touch-icon');
