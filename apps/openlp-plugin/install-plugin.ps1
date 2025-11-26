# PowerShell script to install OpenLP Sync Plugin on Windows

$pluginSource = Join-Path $PSScriptRoot "openlp_sync_plugin"
$pluginDest = Join-Path $env:APPDATA "OpenLP\plugins\openlp_sync_plugin"

Write-Host "Instalowanie OpenLP Sync Plugin..." -ForegroundColor Green
Write-Host ""

# Check if source exists
if (-not (Test-Path $pluginSource)) {
    Write-Host "Błąd: Nie znaleziono folderu wtyczki: $pluginSource" -ForegroundColor Red
    Write-Host "Upewnij się, że uruchamiasz skrypt z folderu apps/openlp-plugin" -ForegroundColor Yellow
    exit 1
}

# Create plugins directory if it doesn't exist
$pluginsDir = Join-Path $env:APPDATA "OpenLP\plugins"
if (-not (Test-Path $pluginsDir)) {
    Write-Host "Tworzenie folderu wtyczek: $pluginsDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}

# Remove existing plugin if present
if (Test-Path $pluginDest) {
    Write-Host "Usuwanie istniejącej wersji wtyczki..." -ForegroundColor Yellow
    Remove-Item -Path $pluginDest -Recurse -Force
}

# Copy plugin
Write-Host "Kopiowanie wtyczki..." -ForegroundColor Yellow
Write-Host "  Z: $pluginSource" -ForegroundColor Gray
Write-Host "  Do: $pluginDest" -ForegroundColor Gray

Copy-Item -Path $pluginSource -Destination $pluginDest -Recurse -Force

if (Test-Path $pluginDest) {
    Write-Host ""
    Write-Host "✓ Wtyczka została zainstalowana pomyślnie!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Następne kroki:" -ForegroundColor Cyan
    Write-Host "1. Uruchom OpenLP" -ForegroundColor White
    Write-Host "2. Przejdź do: Ustawienia → Zarządzaj wtyczkami (Alt+F7)" -ForegroundColor White
    Write-Host "3. Znajdź 'OpenLP Sync Plugin' i włącz go" -ForegroundColor White
    Write-Host "4. Skonfiguruj wtyczkę: Narzędzia → Ustawienia synchronizacji..." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Błąd podczas instalacji wtyczki" -ForegroundColor Red
    exit 1
}


