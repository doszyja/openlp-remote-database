# Skrypt pomocniczy do konfiguracji automatycznego uruchamiania synchronizacji przy starcie systemu
# Uruchom jako administrator: Right-click → Run with PowerShell (as Administrator)

param(
    [string]$ScriptPath = "",
    [switch]$Remove = $false
)

# Sprawdź uprawnienia administratora
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "BŁĄD: Ten skrypt wymaga uprawnień administratora!" -ForegroundColor Red
    Write-Host "Kliknij prawym przyciskiem na plik i wybierz 'Uruchom jako administrator'" -ForegroundColor Yellow
    Read-Host "Naciśnij Enter, aby zakończyć"
    exit 1
}

# Jeśli nie podano ścieżki, użyj bieżącego katalogu
if ([string]::IsNullOrEmpty($ScriptPath)) {
    $ScriptPath = Join-Path $PSScriptRoot "sync-sqlite.ps1"
}

# Sprawdź czy plik istnieje
if (-not (Test-Path $ScriptPath)) {
    Write-Host "BŁĄD: Nie znaleziono skryptu: $ScriptPath" -ForegroundColor Red
    Write-Host "Użyj: .\setup-autostart.ps1 -ScriptPath 'C:\ścieżka\do\sync-sqlite.ps1'" -ForegroundColor Yellow
    Read-Host "Naciśnij Enter, aby zakończyć"
    exit 1
}

$scriptFullPath = Resolve-Path $ScriptPath
$taskName = "OpenLP Database Sync"
$taskDescription = "Automatyczna synchronizacja bazy danych OpenLP przy starcie systemu"

if ($Remove) {
    # Usuń zadanie
    Write-Host "Usuwanie zadania zaplanowanego..." -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host "Zadanie zostało usunięte." -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -like "*nie można znaleźć*") {
            Write-Host "Zadanie nie istnieje." -ForegroundColor Yellow
        } else {
            Write-Host "Błąd podczas usuwania zadania: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }
    Read-Host "Naciśnij Enter, aby zakończyć"
    exit 0
}

# Sprawdź czy zadanie już istnieje
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "UWAGA: Zadanie '$taskName' już istnieje!" -ForegroundColor Yellow
    $response = Read-Host "Czy chcesz je zastąpić? (T/N)"
    if ($response -ne "T" -and $response -ne "t") {
        Write-Host "Anulowano." -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Write-Host "Konfigurowanie automatycznego uruchamiania synchronizacji..." -ForegroundColor Cyan
Write-Host "Ścieżka do skryptu: $scriptFullPath" -ForegroundColor Gray
Write-Host ""

# Utwórz akcję - tryb cichy (-Silent) dla automatycznego uruchamiania
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptFullPath`" -Silent"

# Utwórz wyzwalacz - przy starcie systemu
$trigger = New-ScheduledTaskTrigger -AtStartup

# Utwórz ustawienia
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10)

# Utwórz główną konfigurację zadania
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Zarejestruj zadanie
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $taskDescription `
        -Force | Out-Null

    Write-Host "✓ Zadanie zostało utworzone pomyślnie!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Szczegóły zadania:" -ForegroundColor Cyan
    Write-Host "  Nazwa: $taskName" -ForegroundColor Gray
    Write-Host "  Wyzwalacz: Przy starcie systemu" -ForegroundColor Gray
    Write-Host "  Skrypt: $scriptFullPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Aby przetestować zadanie, uruchom:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Aby usunąć zadanie, uruchom:" -ForegroundColor Yellow
    Write-Host "  .\setup-autostart.ps1 -Remove" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "BŁĄD podczas tworzenia zadania: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Read-Host "Naciśnij Enter, aby zakończyć"

