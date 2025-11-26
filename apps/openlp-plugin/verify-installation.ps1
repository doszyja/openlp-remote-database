# Verify OpenLP plugin installation

$pluginsDir = Join-Path $env:APPDATA "OpenLP\plugins"
$pluginPath = Join-Path $pluginsDir "openlp_sync_plugin"

Write-Host "Sprawdzanie instalacji OpenLP Sync Plugin..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pluginsDir) {
    Write-Host "✓ Folder wtyczek istnieje: $pluginsDir" -ForegroundColor Green
} else {
    Write-Host "✗ Folder wtyczek nie istnieje: $pluginsDir" -ForegroundColor Red
    Write-Host "  Uruchom: mkdir `"$pluginsDir`"" -ForegroundColor Yellow
    exit 1
}

if (Test-Path $pluginPath) {
    Write-Host "✓ Wtyczka zainstalowana: $pluginPath" -ForegroundColor Green
    
    # Check for required files
    $requiredFiles = @(
        "__init__.py",
        "plugin.py",
        "api_client.py",
        "sync_service.py",
        "settings_dialog.py"
    )
    
    Write-Host ""
    Write-Host "Sprawdzanie plików wtyczki..." -ForegroundColor Cyan
    $allPresent = $true
    
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $pluginPath $file
        if (Test-Path $filePath) {
            Write-Host "  ✓ $file" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $file - BRAKUJE!" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    if ($allPresent) {
        Write-Host ""
        Write-Host "✓ Wszystkie pliki są obecne!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Następne kroki:" -ForegroundColor Cyan
        Write-Host "1. Uruchom OpenLP" -ForegroundColor White
        Write-Host "2. Przejdź do: Ustawienia → Zarządzaj wtyczkami (Alt+F7)" -ForegroundColor White
        Write-Host "3. Znajdź 'OpenLP Sync Plugin' i włącz go" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "✗ Niektóre pliki są brakujące. Przeinstaluj wtyczkę." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ Wtyczka nie jest zainstalowana: $pluginPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Aby zainstalować, uruchom:" -ForegroundColor Yellow
    Write-Host "  .\install-plugin.ps1" -ForegroundColor White
    exit 1
}


