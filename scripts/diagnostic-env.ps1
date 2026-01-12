# Script de diagnostic pour .env.local
Write-Host "=== Diagnostic .env.local ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le fichier existe
if (Test-Path .env.local) {
    Write-Host "✅ Fichier .env.local existe" -ForegroundColor Green
    
    # Lire le contenu
    $content = Get-Content .env.local -Raw -ErrorAction SilentlyContinue
    $lines = Get-Content .env.local -ErrorAction SilentlyContinue
    
    Write-Host "📊 Statistiques:" -ForegroundColor Yellow
    Write-Host "   - Taille du fichier: $($content.Length) caractères"
    Write-Host "   - Nombre de lignes: $($lines.Count)"
    Write-Host ""
    
    # Vérifier les variables Supabase
    Write-Host "🔍 Recherche des variables Supabase:" -ForegroundColor Yellow
    
    $hasUrl = $false
    $hasKey = $false
    
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        
        if ($trimmed -match '^NEXT_PUBLIC_SUPABASE_URL\s*=') {
            $hasUrl = $true
            $value = ($trimmed -split '=', 2)[1].Trim()
            Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_URL trouvée" -ForegroundColor Green
            Write-Host "      Valeur: $($value.Substring(0, [Math]::Min(50, $value.Length)))..." -ForegroundColor Gray
        }
        
        if ($trimmed -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=') {
            $hasKey = $true
            $value = ($trimmed -split '=', 2)[1].Trim()
            Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY trouvée" -ForegroundColor Green
            Write-Host "      Longueur: $($value.Length) caractères" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "📋 Résumé:" -ForegroundColor Yellow
    if ($hasUrl) {
        Write-Host "   ✅ URL: Détectée" -ForegroundColor Green
    } else {
        Write-Host "   ❌ URL: Manquante" -ForegroundColor Red
    }
    
    if ($hasKey) {
        Write-Host "   ✅ KEY: Détectée" -ForegroundColor Green
    } else {
        Write-Host "   ❌ KEY: Manquante" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📄 Contenu complet du fichier:" -ForegroundColor Yellow
    Write-Host "---"
    Get-Content .env.local
    Write-Host "---"
    
} else {
    Write-Host "❌ Fichier .env.local n'existe pas" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Solutions possibles:" -ForegroundColor Cyan
Write-Host "   1. Vérifiez que le fichier est bien à la racine du projet"
Write-Host "   2. Vérifiez qu'il n'y a pas d'espaces autour du ="
Write-Host "   3. Vérifiez l'encodage (doit être UTF-8)"
Write-Host "   4. Redémarrez le serveur Next.js après modification"
Write-Host "   5. Supprimez le cache: Remove-Item -Recurse -Force .next"

