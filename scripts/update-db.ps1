Write-Host "🔄 Mise à jour de la base de données..." -ForegroundColor Cyan
Write-Host ""

# Arrête tous les processus Node.js qui pourraient utiliser la base
Write-Host "⏹️  Arrêt des processus Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "📦 Application des changements du schéma..." -ForegroundColor Cyan
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schéma appliqué" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de l'application du schéma" -ForegroundColor Red
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
Write-Host "✅ Mise à jour terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tu peux maintenant redémarrer le serveur avec: npm run dev" -ForegroundColor Cyan









