# Script pour FORCER la suppression du cache
# ATTENTION: Arrêtez d'abord le serveur Next.js (Ctrl+C)

Write-Host "========================================" -ForegroundColor Red
Write-Host "NETTOYAGE FORCE DU CACHE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 1. Arrêter tous les processus Node.js
Write-Host "[1/5] Arrêt des processus Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
if ($nodeProcesses) {
    Write-Host "  Processus Node.js trouves: $($nodeProcesses.Count)" -ForegroundColor Gray
    $nodeProcesses | ForEach-Object {
        Write-Host "  Arret de: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  OK - Processus arretes" -ForegroundColor Green
} else {
    Write-Host "  OK - Aucun processus Node.js en cours" -ForegroundColor Green
}

# 2. Supprimer le cache Next.js
Write-Host "[2/5] Suppression du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (Test-Path ".next") {
        Write-Host "  ERREUR - Impossible de supprimer .next" -ForegroundColor Red
        Write-Host "  Essayez de fermer tous les editeurs et terminaux" -ForegroundColor Yellow
    } else {
        Write-Host "  OK - Cache Next.js supprime" -ForegroundColor Green
    }
} else {
    Write-Host "  OK - Pas de cache a supprimer" -ForegroundColor Green
}

# 3. Supprimer le cache Prisma
Write-Host "[3/5] Suppression du cache Prisma..." -ForegroundColor Yellow
$prismaPaths = @("node_modules\.prisma", "node_modules\@prisma\client")
foreach ($path in $prismaPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "  Supprime: $path" -ForegroundColor Gray
    }
}
Start-Sleep -Seconds 1
Write-Host "  OK - Cache Prisma supprime" -ForegroundColor Green

# 4. Regenerer le client Prisma
Write-Host "[4/5] Regeneration du client Prisma..." -ForegroundColor Yellow
$result = & npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Client Prisma regenere" -ForegroundColor Green
} else {
    Write-Host "  ERREUR lors de la regeneration" -ForegroundColor Red
    Write-Host $result -ForegroundColor Gray
    exit 1
}

# 5. Verifier la table Reminder
Write-Host "[5/5] Verification de la table Reminder..." -ForegroundColor Yellow
$checkScript = @'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.reminder.count().then(c => {
  console.log('OK - Table Reminder accessible (' + c + ' rappels)');
  p.$disconnect();
}).catch(e => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
'@
$checkScript | Out-File -FilePath "temp-check-reminder.ts" -Encoding utf8
$checkResult = & npx tsx temp-check-reminder.ts 2>&1
Remove-Item temp-check-reminder.ts -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "  $checkResult" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - La table Reminder n'est pas accessible" -ForegroundColor Red
    Write-Host $checkResult -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Nettoyage termine!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Redemarrez maintenant le serveur:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""




