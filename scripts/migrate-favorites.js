/**
 * Script pour créer les tables FavoriteArticle et FavoriteStock
 * Exécuter avec: node scripts/migrate-favorites.js
 */

const { execSync } = require('child_process');

console.log('🔄 Génération du client Prisma...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Client Prisma généré avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la génération du client Prisma');
  process.exit(1);
}

console.log('\n🔄 Mise à jour de la base de données...');
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Base de données mise à jour avec succès');
  console.log('\n✨ Les tables FavoriteArticle et FavoriteStock ont été créées !');
  console.log('🔄 Veuillez redémarrer votre serveur de développement.');
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour de la base de données');
  process.exit(1);
}
















