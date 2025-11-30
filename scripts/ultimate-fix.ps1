# Solution ULTIME pour le probleme de cache Prisma/Next.js
# Ce script fait un nettoyage COMPLET

Write-Host "========================================" -ForegroundColor Red
Write-Host "SOLUTION ULTIME - NETTOYAGE COMPLET" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 1. Arreter TOUS les processus Node.js
Write-Host "[1/6] Arret de TOUS les processus Node.js..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | ForEach-Object {
    Write-Host "  Arret: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 3
Write-Host "  OK - Tous les processus arretes" -ForegroundColor Green

# 2. Supprimer le cache Next.js COMPLETEMENT
Write-Host "[2/6] Suppression COMPLETE du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    # Essayer plusieurs fois
    for ($i = 1; $i -le 3; $i++) {
        Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        if (-not (Test-Path ".next")) {
            break
        }
    }
    if (Test-Path ".next") {
        Write-Host "  ERREUR - Impossible de supprimer .next" -ForegroundColor Red
        Write-Host "  Fermez Cursor, VS Code et tous les terminaux!" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "  OK - Cache Next.js supprime" -ForegroundColor Green
    }
} else {
    Write-Host "  OK - Pas de cache a supprimer" -ForegroundColor Green
}

# 3. Supprimer le cache Prisma
Write-Host "[3/6] Suppression du cache Prisma..." -ForegroundColor Yellow
$prismaPaths = @("node_modules\.prisma", "node_modules\@prisma\client")
foreach ($path in $prismaPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "  Supprime: $path" -ForegroundColor Gray
    }
}
Start-Sleep -Seconds 1
Write-Host "  OK - Cache Prisma supprime" -ForegroundColor Green

# 4. Verifier que la table Reminder existe dans la base
Write-Host "[4/6] Verification de la table Reminder dans la base..." -ForegroundColor Yellow
$checkScript = @'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Reminder'`.then((tables: any) => {
  if (tables.length > 0) {
    console.log('OK - Table Reminder EXISTE dans la base');
    p.$disconnect();
  } else {
    console.error('ERREUR - Table Reminder N''EXISTE PAS dans la base!');
    console.error('Il faut appliquer les migrations!');
    process.exit(1);
  }
}).catch((e: any) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
'@
$checkScript | Out-File -FilePath "temp-check-table.ts" -Encoding utf8
$checkResult = & npx tsx temp-check-table.ts 2>&1
Remove-Item temp-check-table.ts -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "  $checkResult" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - La table n'existe pas!" -ForegroundColor Red
    Write-Host "  Application des migrations..." -ForegroundColor Yellow
    & npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERREUR lors de l'application des migrations" -ForegroundColor Red
        exit 1
    }
}

# 5. Regenerer le client Prisma
Write-Host "[5/6] Regeneration du client Prisma..." -ForegroundColor Yellow
$result = & npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Client Prisma regenere" -ForegroundColor Green
} else {
    Write-Host "  ERREUR lors de la regeneration" -ForegroundColor Red
    Write-Host $result -ForegroundColor Gray
    exit 1
}

# 6. Verifier que le client Prisma connait Reminder
Write-Host "[6/6] Verification du client Prisma..." -ForegroundColor Yellow
$verifyScript = @'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const count = await p.reminder.count();
  console.log('OK - Client Prisma connait Reminder (' + count + ' rappels)');
  await p.$disconnect();
} catch (e: any) {
  console.error('ERREUR:', e.message);
  process.exit(1);
}
'@
$verifyScript | Out-File -FilePath "temp-verify-client.ts" -Encoding utf8
$verifyResult = & npx tsx temp-verify-client.ts 2>&1
Remove-Item temp-verify-client.ts -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "  $verifyResult" -ForegroundColor Green
} else {
    Write-Host "  ERREUR - Le client Prisma ne connait pas Reminder!" -ForegroundColor Red
    Write-Host $verifyResult -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "NETTOYAGE COMPLET TERMINE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Redemarrez maintenant le serveur:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Si l'erreur persiste, le probleme vient peut-etre du" -ForegroundColor Yellow
Write-Host "client Prisma global mis en cache dans la memoire Node.js." -ForegroundColor Yellow
Write-Host "Dans ce cas, redemarrez completement votre ordinateur." -ForegroundColor Yellow
Write-Host ""



