/**
 * Script pour générer une clé de chiffrement
 * Usage: npx tsx scripts/generate-encryption-key.ts
 */

import { generateEncryptionKey } from "../app/lib/encryption";

console.log("\n=== Génération de clé de chiffrement ===\n");
console.log("Clé générée (à ajouter dans .env):");
console.log("ENCRYPTION_KEY=" + generateEncryptionKey());
console.log("\n⚠️  IMPORTANT:");
console.log("  - Gardez cette clé secrète et ne la partagez jamais");
console.log("  - Ne la commitez pas dans Git");
console.log("  - Sauvegardez-la dans un gestionnaire de mots de passe");
console.log("  - Si vous perdez cette clé, les données chiffrées seront perdues");
console.log("\n");







