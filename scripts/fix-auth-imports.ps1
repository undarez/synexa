# Script pour remplacer toutes les références à @/app/lib/auth/session par @/app/lib/auth/mock

$files = Get-ChildItem -Path "app" -Recurse -Filter "*.ts" -File | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "@/app/lib/auth/session") {
        Write-Host "Fixing: $($file.FullName)"
        $content = $content -replace '@/app/lib/auth/session', '@/app/lib/auth/mock'
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Done!"

