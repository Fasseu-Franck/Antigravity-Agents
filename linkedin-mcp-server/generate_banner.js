import sharp from "sharp";
import fs from "node:fs";

async function generateVectorBanner() {
  const width = 1200;
  const height = 675;

  const logoBuf = fs.readFileSync("logo-clean.png");
  
  // Resize logo for center placement (width ~460px)
  const resizedLogo = await sharp(logoBuf)
    .resize(460, null, { kernel: "lanczos3" })
    .toBuffer();
    
  const resizedMeta = await sharp(resizedLogo).metadata();

  const logoX = Math.round((width - (resizedMeta.width || 460)) / 2);
  const logoY = Math.round((height - (resizedMeta.height || 160)) / 2) - 40;

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Radial background glow -->
      <radialGradient id="bgGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#c9df32" stop-opacity="0.18" />
        <stop offset="45%" stop-color="#8ea81a" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      
      <!-- Linear glow below logo -->
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c9df32" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#c9df32" stop-opacity="0" />
      </radialGradient>

      <!-- Glass card gradient -->
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.08)" />
        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
      </linearGradient>
    </defs>

    <!-- Base dark background -->
    <rect width="100%" height="100%" fill="#060803" />

    <!-- Ambient radial glow -->
    <rect width="100%" height="100%" fill="url(#bgGlow)" />

    <!-- Subtle tech grid -->
    <g stroke="rgba(201, 223, 50, 0.04)" stroke-width="1">
      <line x1="120" y1="0" x2="120" y2="${height}" />
      <line x1="1080" y1="0" x2="1080" y2="${height}" />
      <line x1="0" y1="120" x2="${width}" y2="120" />
      <line x1="0" y1="550" x2="${width}" y2="550" />
    </g>

    <!-- Outer frame border with glowing outline -->
    <rect x="36" y="36" width="${width - 72}" height="${height - 72}" rx="20" fill="none" stroke="rgba(201, 223, 50, 0.12)" stroke-width="1.5" />

    <!-- Top Badge -->
    <g transform="translate(${width / 2}, 90)">
      <rect x="-140" y="-18" width="280" height="36" rx="18" fill="rgba(201, 223, 50, 0.08)" stroke="rgba(201, 223, 50, 0.25)" stroke-width="1" />
      <circle cx="-100" cy="0" r="4" fill="#c9df32" />
      <text x="-85" y="5" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#c9df32">
        ONIXE.APP // REVEAL
      </text>
    </g>

    <!-- Halo lighting behind the logo -->
    <ellipse cx="${width / 2}" cy="${logoY + (resizedMeta.height || 160) / 2}" rx="280" ry="110" fill="url(#halo)" />

    <!-- Bottom Launch Pill Card -->
    <g transform="translate(${width / 2}, 485)">
      <rect x="-310" y="-30" width="620" height="60" rx="30" fill="url(#cardGrad)" stroke="rgba(201, 223, 50, 0.22)" stroke-width="1.5" />
      
      <text x="-250" y="7" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" letter-spacing="1.5" fill="#ffffff">
        30 NOVEMBRE 2026
      </text>
      
      <circle cx="-45" cy="0" r="3" fill="rgba(255, 255, 255, 0.3)" />
      
      <text x="-25" y="7" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1" fill="#c9df32">
        WAITLIST OUVERTE
      </text>

      <text x="175" y="7" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="rgba(255, 255, 255, 0.75)">
        onixe.app/waitlist
      </text>
    </g>

    <!-- Footer tagline -->
    <text x="${width / 2}" y="575" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" letter-spacing="1" fill="rgba(255, 255, 255, 0.45)">
      Le projet touche à son terme. Rejoignez les accès anticipés.
    </text>
  </svg>
  `;

  const outputFilename = "C:/Users/HP/.gemini/antigravity/brain/6f9e4c08-5b0f-4664-9e80-744fb6b1609f/onixe_launch_banner_clean.png";

  await sharp(Buffer.from(svgOverlay))
    .composite([
      {
        input: resizedLogo,
        top: logoY,
        left: logoX,
      },
    ])
    .png()
    .toFile(outputFilename);

  console.log("Successfully generated banner at:", outputFilename);
}

generateVectorBanner();
