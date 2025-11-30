Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS POUR CORRIGER L'ERREUR" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ARRETEZ le serveur Next.js (Ctrl+C dans le terminal qui execute 'npm run dev')" -ForegroundColor Red
Write-Host ""
Write-Host "2. Ensuite, executez ces commandes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   # Supprime le cache Next.js" -ForegroundColor Gray
Write-Host "   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host ""
Write-Host "   # Supprime le cache Prisma" -ForegroundColor Gray
Write-Host "   Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "   Remove-Item -Recurse -Force node_modules\@prisma\client -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host ""
Write-Host "   # Regenere le client Prisma" -ForegroundColor Gray
Write-Host "   npx prisma generate" -ForegroundColor White
Write-Host ""
Write-Host "   # Redemarre le serveur" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan



