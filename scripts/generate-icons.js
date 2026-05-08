const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Letter "P"
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.55}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PT", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(
    path.join(__dirname, "..", "public", "icons", `icon-${size}.png`),
    buffer
  );
  console.log(`Generated icon-${size}.png`);
}

try {
  generateIcon(192);
  generateIcon(512);
} catch (e) {
  // If canvas not installed, create placeholder
  console.log("canvas package not available, creating placeholder icons");
  // Create minimal 1x1 PNG as placeholder
  const minPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  fs.writeFileSync(path.join(__dirname, "..", "public", "icons", "icon-192.png"), minPng);
  fs.writeFileSync(path.join(__dirname, "..", "public", "icons", "icon-512.png"), minPng);
  console.log("Created placeholder icons - replace with real icons later");
}
