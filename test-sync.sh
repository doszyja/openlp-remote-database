#!/bin/bash
# Wrapper script dla test-sync.ps1 - uruchamia skrypt PowerShell w Git Bash

# Sprawdź czy PowerShell jest dostępny
if ! command -v powershell.exe &> /dev/null; then
    echo "BŁĄD: PowerShell nie jest dostępny!"
    echo "Uruchom ten skrypt w PowerShell lub zainstaluj PowerShell"
    exit 1
fi

# Uruchom skrypt PowerShell
powershell.exe -ExecutionPolicy Bypass -File "./test-sync.ps1" "$@"

