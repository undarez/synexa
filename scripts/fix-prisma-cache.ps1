Write-Host "Correction du cache Prisma et Next.js..." -ForegroundColor Cyan
Write-Host ""

# 1. Supprime le cache Next.js
Write-Host "1. Suppression du cache Next.js (.next)..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "   Cache Next.js supprime" -ForegroundColor Green
} else {
    Write-Host "   Pas de cache Next.js a supprimer" -ForegroundColor Gray
}

# 2. Supprime le cache Prisma
Write-Host ""
Write-Host "2. Suppression du cache Prisma..." -ForegroundColor Yellow
$prismaCachePaths = @(
    "node_modules\.prisma",
    "node_modules\@prisma\client"
)

foreach ($path in $prismaCachePaths) {
    if (Test-Path $path) {
        Write-Host "   Suppression de $path..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

Write-Host "   Cache Prisma supprime" -ForegroundColor Green

# 3. Regenere le client Prisma
Write-Host ""
Write-Host "3. Regeneration du client Prisma..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Client Prisma regenere" -ForegroundColor Green
} else {
    Write-Host "   Erreur lors de la regeneration" -ForegroundColor Red
    exit 1
}

# 4. Verifie que la table Reminder existe
Write-Host ""
Write-Host "4. Verification de la table Reminder..." -ForegroundColor Yellow
$checkScript = @'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.reminder.count().then(c => {
  console.log('Table Reminder trouvee (' + c + ' rappels)');
  p.$disconnect();
}).catch(e => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
'@
$checkScript | Out-File -FilePath "temp-check.ts" -Encoding utf8
npx tsx temp-check.ts
Remove-Item temp-check.ts -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Correction terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Redemarrez maintenant votre serveur Next.js avec 'npm run dev'" -ForegroundColor Cyan
