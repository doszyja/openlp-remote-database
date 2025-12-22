# Instrukcja instalacji OpenLP Sync Plugin

## Wymagania

- OpenLP 3.0 lub nowszy
- Python 3.6 lub nowszy
- Dostęp do internetu (dla pobierania zależności)

## Instalacja krok po kroku

### Krok 1: Znajdź folder wtyczek OpenLP

Folder wtyczek OpenLP zależy od systemu operacyjnego:

#### Windows

```
%APPDATA%\OpenLP\plugins\
```

Lub:

```
C:\Users\<TwojaNazwaUżytkownika>\AppData\Roaming\OpenLP\plugins\
```

#### Linux

```
~/.openlp/plugins/
```

#### macOS

```
~/Library/Application Support/OpenLP/plugins/
```

**Wskazówka**: Jeśli folder `plugins` nie istnieje, utwórz go.

### Krok 2: Skopiuj wtyczkę

**Opcja A: Użyj skryptu instalacyjnego (Zalecane)**

#### Windows (PowerShell)

```powershell
cd apps/openlp-plugin
.\install-plugin.ps1
```

#### Linux/macOS

```bash
cd apps/openlp-plugin
chmod +x install-plugin.sh
./install-plugin.sh
```

**Opcja B: Ręczne kopiowanie**

Jeśli folder `plugins` nie istnieje, najpierw go utwórz:

#### Windows

```powershell
# Utwórz folder (jeśli nie istnieje)
New-Item -ItemType Directory -Path "$env:APPDATA\OpenLP\plugins" -Force

# Skopiuj wtyczkę
Copy-Item -Recurse "apps\openlp-plugin\openlp_sync_plugin" "$env:APPDATA\OpenLP\plugins\"
```

#### Linux/macOS

```bash
# Utwórz folder (jeśli nie istnieje)
mkdir -p ~/.openlp/plugins  # Linux
# lub
mkdir -p ~/Library/Application\ Support/OpenLP/plugins  # macOS

# Skopiuj wtyczkę
cp -r apps/openlp-plugin/openlp_sync_plugin ~/.openlp/plugins/  # Linux
# lub
cp -r apps/openlp-plugin/openlp_sync_plugin ~/Library/Application\ Support/OpenLP/plugins/  # macOS
```

### Krok 3: Włącz wtyczkę w OpenLP

1. Uruchom OpenLP
2. Przejdź do: `Ustawienia` → `Zarządzaj wtyczkami` (lub naciśnij `Alt+F7`)
3. Znajdź "OpenLP Sync Plugin" na liście
4. Zaznacz checkbox obok nazwy wtyczki, aby ją włączyć
5. Kliknij "OK" lub "Zamknij"

### Krok 4: Skonfiguruj wtyczkę

1. W OpenLP przejdź do menu `Narzędzia` → `Ustawienia synchronizacji...`
2. Wprowadź:
   - **URL API**: Adres Twojego backend API (np. `http://localhost:3000/api`)
   - **Klucz API** (opcjonalnie): Jeśli API wymaga autoryzacji
   - **Ścieżka do bazy danych**: Ścieżka do pliku `songs.sqlite` OpenLP (można zostawić puste, aby auto-wykryć)
3. Kliknij "Zapisz"

## Weryfikacja instalacji

Po instalacji powinieneś zobaczyć:

1. W menu `Narzędzia` opcję "Synchronizuj"
2. W menu `Narzędzia` opcję "Ustawienia synchronizacji..."

## Rozwiązywanie problemów

### Problem: Wtyczka nie pojawia się w liście wtyczek

**Rozwiązanie**:

- Sprawdź, czy folder wtyczki jest w prawidłowej lokalizacji
- Sprawdź, czy wszystkie pliki są obecne (powinny być: `__init__.py`, `plugin.py`, `api_client.py`, `sync_service.py`, `settings_dialog.py`)
- Sprawdź logi OpenLP pod kątem błędów

### Problem: Błąd importu modułów Python

**Rozwiązanie**:

- Sprawdź, czy wszystkie pliki wtyczki zostały poprawnie skopiowane
- Upewnij się, że używasz OpenLP 3.0+ z Pythonem 3.6+

### Problem: Nie można znaleźć bazy danych OpenLP

**Rozwiązanie**:

- W ustawieniach wtyczki ręcznie wskaż ścieżkę do pliku `songs.sqlite`
- Typowe lokalizacje:
  - Windows: `%APPDATA%\OpenLP\songs.sqlite`
  - Linux: `~/.openlp/songs.sqlite`
  - macOS: `~/Library/Application Support/OpenLP/songs.sqlite`

### Problem: Błąd połączenia z API

**Rozwiązanie**:

- Sprawdź, czy URL API jest poprawny
- Sprawdź, czy backend API jest uruchomiony
- Sprawdź, czy klucz API (jeśli wymagany) jest poprawny
- Sprawdź połączenie sieciowe

## Odinstalowanie

Aby odinstalować wtyczkę:

1. W OpenLP wyłącz wtyczkę: `Ustawienia` → `Zarządzaj wtyczkami`
2. Usuń folder wtyczki z folderu wtyczek OpenLP
3. (Opcjonalnie) Usuń ustawienia wtyczki z pliku konfiguracyjnego OpenLP

## Aktualizacja

Aby zaktualizować wtyczkę:

1. Wyłącz wtyczkę w OpenLP
2. Zastąp folder wtyczki nową wersją
3. Włącz wtyczkę ponownie
4. Sprawdź ustawienia (mogą wymagać aktualizacji)

## Wsparcie

Jeśli masz problemy z instalacją, sprawdź:

- Dokumentację główną: `apps/openlp-plugin/README.md`
- Dokumentację techniczną: `docs/OPENLP_PLUGIN.md`
- Logi OpenLP pod kątem błędów
