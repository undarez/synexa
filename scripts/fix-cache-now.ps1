# Script rapide pour corriger le cache Prisma/Next.js
# Executez ce script APRES avoir arrete le serveur Next.js (Ctrl+C)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CORRECTION DU CACHE PRISMA/NEXT.JS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Supprime le cache Next.js
Write-Host "[1/3] Suppression du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "  OK - Cache Next.js supprime" -ForegroundColor Green
} else {
    Write-Host "  OK - Pas de cache a supprimer" -ForegroundColor Gray
}

# 2. Supprime le cache Prisma
Write-Host "[2/3] Suppression du cache Prisma..." -ForegroundColor Yellow
$paths = @("node_modules\.prisma", "node_modules\@prisma\client")
foreach ($path in $paths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}
Write-Host "  OK - Cache Prisma supprime" -ForegroundColor Green

# 3. Regenere le client Prisma
Write-Host "[3/3] Regeneration du client Prisma..." -ForegroundColor Yellow
$result = & npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Client Prisma regenere" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - Impossible de regenerer" -ForegroundColor Red
    Write-Host "  Assurez-vous que le serveur Next.js est bien arrete!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Si l'erreur persiste, fermez tous les processus Node.js:" -ForegroundColor Yellow
    Write-Host "  Get-Process node | Stop-Process -Force" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Correction terminee avec succes!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant redemarrer le serveur:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""



