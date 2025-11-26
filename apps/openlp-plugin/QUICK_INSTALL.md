# Szybka instalacja - Windows

## Krok 1: Utwórz folder wtyczek (jeśli nie istnieje)

W PowerShell lub CMD:
```powershell
mkdir "$env:APPDATA\OpenLP\plugins"
```

Lub w Git Bash:
```bash
mkdir -p "$APPDATA/OpenLP/plugins"
```

## Krok 2: Skopiuj wtyczkę

### Opcja A: Użyj skryptu PowerShell (Zalecane)

W PowerShell (uruchom jako administrator jeśli potrzeba):
```powershell
cd apps/openlp-plugin
.\install-plugin.ps1
```

### Opcja B: Ręczne kopiowanie

W PowerShell:
```powershell
Copy-Item -Recurse "apps\openlp-plugin\openlp_sync_plugin" "$env:APPDATA\OpenLP\plugins\"
```

W Git Bash:
```bash
cp -r apps/openlp-plugin/openlp_sync_plugin "$APPDATA/OpenLP/plugins/"
```

## Krok 3: Włącz wtyczkę w OpenLP

1. Uruchom OpenLP
2. Przejdź do: `Ustawienia` → `Zarządzaj wtyczkami` (lub `Alt+F7`)
3. Znajdź "OpenLP Sync Plugin" i zaznacz checkbox
4. Kliknij "OK"

## Krok 4: Skonfiguruj wtyczkę

1. W OpenLP przejdź do: `Narzędzia` → `Ustawienia synchronizacji...`
2. Wprowadź URL API (np. `http://localhost:3000/api`)
3. Kliknij "Zapisz"

## Gotowe!

Teraz możesz używać przycisku "Synchronizuj" w menu `Narzędzia` OpenLP.


