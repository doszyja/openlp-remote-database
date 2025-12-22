# Skrypt synchronizacji bazy danych OpenLP z serwera
# Pobiera plik songs.sqlite z API i zastępuje lokalny plik w OpenLP

param(
    [string]$ApiUrl = "http://localhost:3000/api",
    [string]$OpenLpDbPath = "",  # Domyślnie: automatycznie wykryje lokalizację OpenLP
    [switch]$Backup = $true,
    [switch]$Silent = $false  # Tryb cichy - bez interakcji użytkownika (dla automatycznego uruchamiania)
)

# Automatycznie wykryj lokalizację OpenLP jeśli nie podano
if ([string]::IsNullOrEmpty($OpenLpDbPath)) {
    # Standardowa lokalizacja OpenLP w Windows: %APPDATA%\openlp\data\songs\songs.sqlite
    $OpenLpDbPath = Join-Path $env:APPDATA "openlp\data\songs\songs.sqlite"
    
    # Jeśli nie istnieje, spróbuj alternatywnej lokalizacji (bez podkatalogu songs)
    if (-not (Test-Path (Split-Path -Parent $OpenLpDbPath))) {
        $OpenLpDbPath = Join-Path $env:APPDATA "openlp\data\songs.sqlite"
    }
    
    # Jeśli nadal nie istnieje, spróbuj starej lokalizacji (stara wersja OpenLP)
    if (-not (Test-Path (Split-Path -Parent $OpenLpDbPath))) {
        $OpenLpDbPath = "C:\Program Files\OpenLP\songs.sqlite"
    }
}

Write-Host "=== Synchronizacja bazy danych OpenLP ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Lokalizacja bazy danych: $OpenLpDbPath" -ForegroundColor Gray
Write-Host ""

# Sprawdź czy OpenLP jest zamknięty
$openLpProcess = Get-Process -Name "OpenLP" -ErrorAction SilentlyContinue
if ($openLpProcess) {
    if (-not $Silent) {
        Write-Host "UWAGA: OpenLP jest uruchomiony!" -ForegroundColor Yellow
        Write-Host "Zamknij OpenLP przed synchronizacja i uruchom skrypt ponownie." -ForegroundColor Yellow
        Read-Host "Nacisnij Enter, aby zakonczyc"
    } else {
        Write-Host "UWAGA: OpenLP jest uruchomiony - pomijam synchronizacje" -ForegroundColor Yellow
    }
    exit 1
}

# Sprawdź czy ścieżka do bazy danych istnieje i utwórz katalog jeśli nie istnieje
$openLpDir = Split-Path -Parent $OpenLpDbPath
if (-not (Test-Path $openLpDir)) {
    Write-Host "Katalog OpenLP nie istnieje, tworzenie: $openLpDir" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $openLpDir -Force | Out-Null
        Write-Host "Katalog utworzony pomyslnie." -ForegroundColor Green
    } catch {
        Write-Host "BLAD: Nie mozna utworzyc katalogu: $openLpDir" -ForegroundColor Red
        Write-Host "Sprawdz uprawnienia lub podaj sciezke recznie." -ForegroundColor Red
        Read-Host "Nacisnij Enter, aby zakonczyc"
        exit 1
    }
}

# Utwórz kopię zapasową, jeśli istnieje stary plik
if ($Backup -and (Test-Path $OpenLpDbPath)) {
    $backupPath = "$OpenLpDbPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "Tworzenie kopii zapasowej..." -ForegroundColor Yellow
    Copy-Item -Path $OpenLpDbPath -Destination $backupPath -Force
    Write-Host "Kopia zapasowa utworzona: $backupPath" -ForegroundColor Green
    Write-Host ""
}

# Pobierz plik SQLite z API
Write-Host "Pobieranie bazy danych z serwera..." -ForegroundColor Yellow
Write-Host "URL: $ApiUrl/songs/export/sqlite" -ForegroundColor Gray

$tempFile = Join-Path $env:TEMP "songs-$(Get-Date -Format 'yyyyMMdd-HHmmss').sqlite"

try {
    # Pobierz plik
    $response = Invoke-WebRequest -Uri "$ApiUrl/songs/export/sqlite" -OutFile $tempFile -ErrorAction Stop
    
    if (-not (Test-Path $tempFile)) {
        throw "Plik nie zostal pobrany"
    }

    $fileSize = (Get-Item $tempFile).Length
    Write-Host "Pobrano plik: $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host ""

    # Sprawdź czy plik jest prawidłowym plikiem SQLite (sprawdź magic bytes)
    $header = [System.IO.File]::ReadAllBytes($tempFile)[0..15]
    $sqliteMagic = [System.Text.Encoding]::ASCII.GetBytes("SQLite format 3")
    $isValid = $true
    for ($i = 0; $i -lt $sqliteMagic.Length; $i++) {
        if ($header[$i] -ne $sqliteMagic[$i]) {
            $isValid = $false
            break
        }
    }

    if (-not $isValid) {
        throw "Pobrany plik nie jest prawidlowym plikiem SQLite"
    }

    Write-Host "Weryfikacja pliku: OK" -ForegroundColor Green
    Write-Host ""

    # Zastąp stary plik nowym
    Write-Host "Zastepowanie bazy danych OpenLP..." -ForegroundColor Yellow
    
    # Zamknij wszystkie otwarte połączenia do bazy danych (jeśli istnieją)
    # W Windows może być problem z blokadą pliku, więc spróbuj kilka razy
    $maxRetries = 5
    $retryCount = 0
    $copied = $false

    while ($retryCount -lt $maxRetries -and -not $copied) {
        try {
            Copy-Item -Path $tempFile -Destination $OpenLpDbPath -Force -ErrorAction Stop
            $copied = $true
            Write-Host "Baza danych została zaktualizowana!" -ForegroundColor Green
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host ("Proba " + $retryCount + "/" + $maxRetries + ": Oczekiwanie na zwolnienie pliku...") -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                throw "Nie mozna zastapic pliku. Upewnij sie, ze OpenLP jest zamkniete."
            }
        }
    }

    Write-Host ""
    Write-Host "=== Synchronizacja zakonczona pomyslnie! ===" -ForegroundColor Green
    Write-Host "Mozesz teraz uruchomic OpenLP." -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "BLAD podczas synchronizacji:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Kod odpowiedzi HTTP: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 404) {
            Write-Host "Sprawdz czy URL API jest poprawny: $ApiUrl" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "Blad serwera. Skontaktuj sie z administratorem." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    if (-not $Silent) {
        Read-Host "Nacisnij Enter, aby zakonczyc"
    }
    exit 1
} finally {
    # Usuń plik tymczasowy
    if (Test-Path $tempFile) {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
if (-not $Silent) {
    Read-Host "Nacisnij Enter, aby zakonczyc"
}

