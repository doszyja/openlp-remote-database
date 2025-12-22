@echo off
REM Skrypt synchronizacji bazy danych OpenLP z serwera
REM Uruchamia skrypt PowerShell do pobrania i aktualizacji bazy danych

echo === Synchronizacja bazy danych OpenLP ===
echo.

REM Sprawdź czy PowerShell jest dostępny
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo BŁĄD: PowerShell nie jest dostępny!
    pause
    exit /b 1
)

REM Uruchom skrypt PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0sync-sqlite.ps1" %*

if errorlevel 1 (
    echo.
    echo Synchronizacja zakończona z błędami.
    pause
    exit /b 1
)

echo.
echo Synchronizacja zakończona pomyślnie.
pause

