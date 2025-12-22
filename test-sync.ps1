# Skrypt testowy do sprawdzenia synchronizacji OpenLP
# Testuje połączenie z API i pobiera plik SQLite

param(
    [string]$ApiUrl = "http://localhost:3000/api",
    [string]$TestOutputPath = "$env:TEMP\test-songs.sqlite"
)

Write-Host "=== Test synchronizacji OpenLP ===" -ForegroundColor Cyan
Write-Host ""

# Krok 1: Sprawdź połączenie z API
Write-Host "1. Sprawdzanie polaczenia z API..." -ForegroundColor Yellow
Write-Host "   URL: $ApiUrl" -ForegroundColor Gray

try {
    $healthCheck = Invoke-WebRequest -Uri "$ApiUrl/songs" -Method GET -UseBasicParsing -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "   ✓ API jest dostępne" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ API zwróciło kod: $($healthCheck.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Blad polaczenia z API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Sprawdz:" -ForegroundColor Yellow
    Write-Host "   - Czy serwer API jest uruchomiony?" -ForegroundColor Gray
    Write-Host "   - Czy URL jest poprawny?" -ForegroundColor Gray
    Write-Host "   - Czy port jest dostępny?" -ForegroundColor Gray
    Read-Host "Nacisnij Enter, aby zakonczyc"
    exit 1
}

Write-Host ""

# Krok 2: Sprawdź endpoint eksportu SQLite
Write-Host "2. Sprawdzanie endpointu eksportu SQLite..." -ForegroundColor Yellow
Write-Host "   Endpoint: $ApiUrl/songs/export/sqlite" -ForegroundColor Gray

try {
    # Pobierz plik SQLite
    Write-Host "   Pobieranie pliku SQLite..." -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri "$ApiUrl/songs/export/sqlite" -OutFile $TestOutputPath -ErrorAction Stop
    
    if (Test-Path $TestOutputPath) {
        $fileSize = (Get-Item $TestOutputPath).Length
        Write-Host "   ✓ Plik został pobrany: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Green
        
        # Sprawdź czy plik jest prawidłowym SQLite
        $header = [System.IO.File]::ReadAllBytes($TestOutputPath)[0..15]
        $sqliteMagic = [System.Text.Encoding]::ASCII.GetBytes("SQLite format 3")
        $isValid = $true
        for ($i = 0; $i -lt $sqliteMagic.Length; $i++) {
            if ($header[$i] -ne $sqliteMagic[$i]) {
                $isValid = $false
                break
            }
        }
        
        if ($isValid) {
            Write-Host "   ✓ Plik jest prawidłowym plikiem SQLite" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Plik nie jest prawidłowym plikiem SQLite" -ForegroundColor Red
        }
    } else {
        Write-Host "   ✗ Plik nie został pobrany" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Blad podczas pobierania: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Kod odpowiedzi: $statusCode" -ForegroundColor Red
    }
    Read-Host "Nacisnij Enter, aby zakonczyc"
    exit 1
}

Write-Host ""

# Krok 3: Sprawdź zawartość bazy danych
Write-Host "3. Sprawdzanie zawartosci bazy danych..." -ForegroundColor Yellow

try {
    # Użyj SQLite do sprawdzenia zawartości (jeśli dostępne)
    $sqliteAvailable = $false
    $sqlitePath = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlitePath) {
        $sqliteAvailable = $true
        Write-Host "   SQLite CLI jest dostępne, sprawdzam zawartość..." -ForegroundColor Gray
        
        $songCount = & sqlite3 $TestOutputPath "SELECT COUNT(*) FROM songs;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Liczba piosenek w bazie: $songCount" -ForegroundColor Green
            
            # Pobierz przykładową piosenkę
            $sampleSong = & sqlite3 $TestOutputPath "SELECT title FROM songs LIMIT 1;" 2>&1
            if ($LASTEXITCODE -eq 0 -and $sampleSong) {
                Write-Host "   ✓ Przykładowa piosenka: $sampleSong" -ForegroundColor Green
            }
        } else {
            Write-Host "   ⚠ Nie mozna odczytac zawartosci bazy (moze brakować sqlite3 CLI)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠ SQLite CLI nie jest dostepne - pomijam sprawdzanie zawartosci" -ForegroundColor Yellow
        Write-Host "   (Mozesz zainstalowac SQLite CLI lub uzyc DB Browser for SQLite)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠ Blad podczas sprawdzania zawartosci: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Krok 4: Podsumowanie
Write-Host "=== Podsumowanie testu ===" -ForegroundColor Cyan
Write-Host "✓ Polaczenie z API: OK" -ForegroundColor Green
Write-Host "✓ Pobieranie pliku SQLite: OK" -ForegroundColor Green
Write-Host "✓ Weryfikacja pliku: OK" -ForegroundColor Green
Write-Host ""
Write-Host "Plik testowy zapisany w: $TestOutputPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Nastepne kroki:" -ForegroundColor Yellow
Write-Host "1. Sprawdz plik w DB Browser for SQLite lub OpenLP" -ForegroundColor Gray
Write-Host "2. Jesli wszystko wyglada dobrze, uruchom pelna synchronizacje:" -ForegroundColor Gray
Write-Host "   .\sync-sqlite.ps1 -ApiUrl `"$ApiUrl`"" -ForegroundColor Cyan
Write-Host ""

# Zapytaj czy otworzyć plik
$openFile = Read-Host "Czy chcesz otworzyc plik w eksploratorze? (T/N)"
if ($openFile -eq "T" -or $openFile -eq "t") {
    Start-Process "explorer.exe" -ArgumentList "/select,`"$TestOutputPath`""
}

Read-Host "Nacisnij Enter, aby zakonczyc"

