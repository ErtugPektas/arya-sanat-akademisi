$token = $args[0]
$git = "C:\Users\ertug\Git\cmd\git.exe"
$projectPath = "C:\Users\ertug\Desktop\AryaSanatAkademisi"

if (-not $token) {
    Write-Host "Kullanim: .\git_push.ps1 <GITHUB_TOKEN>"
    Write-Host ""
    Write-Host "Token almak icin:"
    Write-Host "1. github.com -> Settings -> Developer settings"
    Write-Host "2. Personal access tokens -> Tokens (classic)"
    Write-Host "3. Generate new token (classic)"
    Write-Host "4. Scope: repo (hepsini sec)"
    Write-Host "5. Generate token"
    exit 1
}

Set-Location $projectPath

# GitHub'da repo olustur
Write-Host "=== GitHub'da repo olusturuluyor ==="
$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github.v3+json"
}
$body = @{
    name = "arya-sanat-akademisi"
    description = "Arya Sanat Akademisi - Kayseri Kocasinan Muzik Akademisi"
    private = $false
    auto_init = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Repo olusturuldu: $($response.html_url)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "Repo zaten mevcut, devam ediliyor..."
    } else {
        Write-Host "Hata: $_"
        exit 1
    }
}

# Remote ekle ve push yap
Write-Host "=== Remote ekleniyor ==="
& $git remote remove origin 2>$null
& $git remote add origin "https://$token@github.com/ErtugPektas/arya-sanat-akademisi.git"

Write-Host "=== GitHub'a push yapiliyor ==="
& $git push -u origin main

Write-Host "=== TAMAMLANDI ==="
Write-Host "Repo: https://github.com/ErtugPektas/arya-sanat-akademisi"
