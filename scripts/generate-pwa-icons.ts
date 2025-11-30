/**
 * Script pour générer les icônes PWA
 * 
 * Ce script crée des icônes SVG simples pour le PWA.
 * En production, vous devriez utiliser de vraies icônes PNG.
 */

import { writeFileSync } from "fs";
import { join } from "path";

const publicDir = join(process.cwd(), "public");

// Icône SVG simple pour Synexa
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="180" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>`;

// Convertir SVG en instructions pour créer des PNG
// Note: En production, utilisez un outil comme sharp ou ImageMagick
console.log("Icônes PWA à créer:");
console.log("- icon-192.png (192x192)");
console.log("- icon-512.png (512x512)");
console.log("\nPour créer les PNG, utilisez:");
console.log("1. Un outil en ligne: https://realfavicongenerator.net/");
console.log("2. Ou installez sharp: npm install sharp");
console.log("\nPour l'instant, créons des fichiers SVG temporaires...");

// Créer des fichiers SVG temporaires (seront remplacés par des PNG)
writeFileSync(join(publicDir, "icon-192.svg"), iconSvg.replace('width="512" height="512"', 'width="192" height="192"'));
writeFileSync(join(publicDir, "icon-512.svg"), iconSvg);

console.log("\n✅ Fichiers SVG créés (temporaires)");
console.log("⚠️  Remplacez-les par des PNG pour une meilleure compatibilité PWA");


