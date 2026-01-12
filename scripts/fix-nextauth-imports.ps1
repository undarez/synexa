# Script pour remplacer toutes les références à next-auth/react par le mock

$files = Get-ChildItem -Path "app" -Recurse -Filter "*.tsx" -File | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match "next-auth/react") {
        Write-Host "Fixing: $($file.FullName)"
        $content = $content -replace 'from "next-auth/react"', 'from "@/app/lib/auth/mock-client"'
        $content = $content -replace "from 'next-auth/react'", "from '@/app/lib/auth/mock-client'"
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Done!"

