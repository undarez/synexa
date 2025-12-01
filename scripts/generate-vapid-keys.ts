/**
 * Script pour générer les clés VAPID pour Web Push
 * 
 * Usage: npx tsx scripts/generate-vapid-keys.ts
 */

import webpush from "web-push";

console.log("🔑 Génération des clés VAPID pour Web Push...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("✅ Clés générées avec succès!\n");
console.log("Ajoutez ces variables à votre fichier .env:\n");
console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("VAPID_SUBJECT=mailto:votre-email@exemple.com\n");
console.log("⚠️  IMPORTANT: Ne partagez JAMAIS votre clé privée!");




