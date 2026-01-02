Write-Host "🔄 Réinitialisation complète de la base de données..." -ForegroundColor Cyan
Write-Host ""

# Arrête tous les processus Node.js qui pourraient utiliser la base
Write-Host "⏹️  Arrêt des processus Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Supprime tout
Write-Host "🗑️  Suppression des fichiers..." -ForegroundColor Yellow
Remove-Item -Recurse -Force prisma\dev.db -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force prisma\migrations -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force prisma\prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force app\generated\prisma -ErrorAction SilentlyContinue

Write-Host "✅ Fichiers supprimés" -ForegroundColor Green
Write-Host ""

# Crée les tables
Write-Host "📦 Création des tables..." -ForegroundColor Cyan
npx prisma db push --accept-data-loss --skip-generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tables créées" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la création des tables" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Génération du client Prisma..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client généré" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la génération" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Réinitialisation terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tu peux maintenant redémarrer le serveur avec: npm run dev" -ForegroundColor Cyan











