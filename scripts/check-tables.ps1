Write-Host "🔍 Vérification de la base de données..." -ForegroundColor Cyan
Write-Host ""

$dbPath = "prisma\dev.db"
if (Test-Path $dbPath) {
    Write-Host "✅ Fichier de base de données trouvé: $dbPath" -ForegroundColor Green
    
    # Vérifie la taille du fichier
    $fileSize = (Get-Item $dbPath).Length
    Write-Host "   Taille: $fileSize octets" -ForegroundColor Gray
    
    if ($fileSize -lt 1000) {
        Write-Host "⚠️  La base de données semble vide!" -ForegroundColor Yellow
    } else {
        Write-Host "✅ La base de données contient des données" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Fichier de base de données introuvable: $dbPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Exécution de prisma db push..." -ForegroundColor Cyan
npx prisma db push --skip-generate











