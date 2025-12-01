# Script pour corriger le probleme de la table Reminder
# Executez ce script APRES avoir arrete le serveur Next.js

Write-Host "Correction de la table Reminder..." -ForegroundColor Cyan
Write-Host ""

# 1. Supprime le cache Next.js
Write-Host "[1/4] Suppression du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "  OK - Cache Next.js supprime" -ForegroundColor Green
} else {
    Write-Host "  OK - Pas de cache a supprimer" -ForegroundColor Gray
}

# 2. Supprime le cache Prisma
Write-Host "[2/4] Suppression du cache Prisma..." -ForegroundColor Yellow
$paths = @("node_modules\.prisma", "node_modules\@prisma\client")
foreach ($path in $paths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}
Write-Host "  OK - Cache Prisma supprime" -ForegroundColor Green

# 3. Regenere le client Prisma
Write-Host "[3/4] Regeneration du client Prisma..." -ForegroundColor Yellow
$result = & npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Client Prisma regenere" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - Impossible de regenerer le client Prisma" -ForegroundColor Red
    Write-Host "  Assurez-vous que le serveur Next.js est bien arrete!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Sortie:" -ForegroundColor Gray
    Write-Host $result -ForegroundColor Gray
    exit 1
}

# 4. Verifie la table
Write-Host "[4/4] Verification de la table Reminder..." -ForegroundColor Yellow
$checkResult = & npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.reminder.count().then(c => { console.log('OK'); p.`$disconnect(); }).catch(e => { console.error('ERREUR:', e.message); process.exit(1); });" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Table Reminder accessible" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - La table Reminder n'est pas accessible" -ForegroundColor Red
    Write-Host $checkResult -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Correction terminee avec succes!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant redemarrer le serveur avec:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""




