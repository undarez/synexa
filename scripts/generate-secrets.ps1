# Script PowerShell pour générer les secrets NEXTAUTH_SECRET et CRON_SECRET
# Usage: .\scripts\generate-secrets.ps1

Write-Host ""
Write-Host "=== Generation des secrets ===" -ForegroundColor Cyan
Write-Host ""

# Générer NEXTAUTH_SECRET
$nextAuthSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Générer CRON_SECRET
$cronSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

Write-Host "Secrets generes avec succes!" -ForegroundColor Green
Write-Host ""
Write-Host "Ajoutez ces variables a votre fichier .env:" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXTAUTH_SECRET=$nextAuthSecret" -ForegroundColor White
Write-Host "CRON_SECRET=$cronSecret" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "  - Gardez ces secrets confidentiels et ne les partagez jamais" -ForegroundColor Yellow
Write-Host "  - Ne les commitez pas dans Git" -ForegroundColor Yellow
Write-Host "  - Sauvegardez-les dans un gestionnaire de mots de passe" -ForegroundColor Yellow
Write-Host "  - Si vous perdez NEXTAUTH_SECRET, les utilisateurs devront se reconnecter" -ForegroundColor Yellow
Write-Host "  - Si vous perdez CRON_SECRET, les cron jobs ne fonctionneront plus" -ForegroundColor Yellow
Write-Host ""












