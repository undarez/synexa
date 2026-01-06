/**
 * Script pour générer les secrets NEXTAUTH_SECRET et CRON_SECRET
 * Usage: npx tsx scripts/generate-secrets.ts
 */

import crypto from "crypto";

/**
 * Génère un secret aléatoire sécurisé en base64
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString("base64");
}

console.log("\n=== Génération des secrets ===\n");

const nextAuthSecret = generateSecret();
const cronSecret = generateSecret();

console.log("✅ Secrets générés avec succès!\n");
console.log("Ajoutez ces variables à votre fichier .env:\n");
console.log("NEXTAUTH_SECRET=" + nextAuthSecret);
console.log("CRON_SECRET=" + cronSecret);
console.log("\n⚠️  IMPORTANT:");
console.log("  - Gardez ces secrets confidentiels et ne les partagez jamais");
console.log("  - Ne les commitez pas dans Git");
console.log("  - Sauvegardez-les dans un gestionnaire de mots de passe");
console.log("  - Si vous perdez NEXTAUTH_SECRET, les utilisateurs devront se reconnecter");
console.log("  - Si vous perdez CRON_SECRET, les cron jobs ne fonctionneront plus");
console.log("\n");













