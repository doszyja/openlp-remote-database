# Przewodnik testowania synchronizacji OpenLP

## Szybki test

### Krok 1: Sprawdź czy API działa

1. Uruchom serwer API (jeśli jeszcze nie działa):

   ```bash
   cd apps/api
   pnpm dev
   ```

2. Sprawdź czy API odpowiada:
   - Otwórz przeglądarkę: `http://localhost:3000/api/songs`
   - Powinieneś zobaczyć listę piosenek (lub pustą listę jeśli baza jest pusta)

### Krok 2: Przetestuj endpoint eksportu SQLite

#### Metoda 1: Użyj skryptu testowego (Zalecane)

1. Uruchom skrypt testowy:

   **W PowerShell:**

   ```powershell
   .\test-sync.ps1
   ```

   **W Git Bash:**

   ```bash
   ./test-sync.sh
   # lub
   powershell.exe -ExecutionPolicy Bypass -File "./test-sync.ps1"
   ```

2. Skrypt automatycznie:
   - Sprawdzi połączenie z API
   - Pobierze plik SQLite
   - Zweryfikuje czy plik jest poprawny
   - Pokaże liczbę piosenek w bazie

#### Metoda 2: Test ręczny w przeglądarce

1. Otwórz w przeglądarce:

   ```
   http://localhost:3000/api/songs/export/sqlite
   ```

2. Plik `songs-YYYY-MM-DD.sqlite` powinien zostać pobrany

#### Metoda 3: Test przez PowerShell

```powershell
# Pobierz plik SQLite
Invoke-WebRequest -Uri "http://localhost:3000/api/songs/export/sqlite" -OutFile "test-songs.sqlite"

# Sprawdź czy plik istnieje
Test-Path "test-songs.sqlite"
```

### Krok 3: Sprawdź zawartość pliku SQLite

#### Opcja A: DB Browser for SQLite (Zalecane)

1. Pobierz i zainstaluj [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Otwórz pobrany plik `songs.sqlite`
3. Sprawdź:
   - Tabela `songs` zawiera piosenki
   - Kolumna `lyrics` zawiera XML z wersami
   - Kolumna `title` zawiera tytuły piosenek

#### Opcja B: SQLite CLI

```powershell
# Sprawdź liczbę piosenek
sqlite3 test-songs.sqlite "SELECT COUNT(*) FROM songs;"

# Pokaż przykładowe piosenki
sqlite3 test-songs.sqlite "SELECT id, title FROM songs LIMIT 5;"

# Sprawdź strukturę tabeli
sqlite3 test-songs.sqlite ".schema songs"
```

### Krok 4: Przetestuj pełną synchronizację

1. **Zamknij OpenLP** (jeśli jest uruchomione)

2. **Uruchom skrypt synchronizacji**:

   ```powershell
   .\sync-sqlite.ps1 -ApiUrl "http://localhost:3000/api"
   ```

3. **Sprawdź wynik**:
   - Skrypt powinien pobrać plik
   - Zastąpić lokalny plik `songs.sqlite` w OpenLP
   - Wyświetlić komunikat o powodzeniu

4. **Otwórz OpenLP** i sprawdź:
   - Czy piosenki są widoczne
   - Czy wersy są poprawnie wyświetlane
   - Czy tytuły są poprawne

## Testowanie różnych scenariuszy

### Test 1: Pusta baza danych

1. Usuń wszystkie piosenki z MongoDB (lub użyj pustej bazy)
2. Uruchom eksport SQLite
3. Sprawdź czy plik SQLite jest utworzony (nawet jeśli pusty)

### Test 2: Duża baza danych

1. Zaimportuj wiele piosenek (np. przez skrypt migracji)
2. Uruchom eksport SQLite
3. Sprawdź czy wszystkie piosenki są w pliku

### Test 3: Piosenki z wersami

1. Utwórz piosenkę z wieloma wersami w MongoDB
2. Uruchom eksport SQLite
3. Sprawdź czy wersy są poprawnie sformatowane w XML

### Test 4: Piosenki z tagami

1. Utwórz piosenkę z tagami
2. Uruchom eksport SQLite
3. Sprawdź czy kolumna `theme_name` zawiera tagi (comma-separated)

## Rozwiązywanie problemów

### Problem: API nie odpowiada

**Sprawdź:**

- Czy serwer API jest uruchomiony?
- Czy port 3000 jest dostępny?
- Czy nie ma błędów w konsoli serwera?

**Rozwiązanie:**

```bash
# Sprawdź czy serwer działa
curl http://localhost:3000/api/songs

# Sprawdź logi serwera
# W konsoli gdzie uruchomiono `pnpm dev` powinny być logi
```

### Problem: Plik SQLite jest pusty lub uszkodzony

**Sprawdź:**

- Czy w MongoDB są piosenki?
- Czy piosenki nie są oznaczone jako usunięte (`deletedAt: null`)?

**Rozwiązanie:**

```powershell
# Sprawdź zawartość MongoDB
# Użyj MongoDB Compass lub:
# mongo openlp_db --eval "db.songs.countDocuments({deletedAt: null})"
```

### Problem: OpenLP nie widzi piosenek po synchronizacji

**Sprawdź:**

- Czy plik został poprawnie zastąpiony?
- Czy OpenLP jest zamknięte podczas synchronizacji?
- Czy masz uprawnienia do zapisu w katalogu OpenLP?

**Rozwiązanie:**

1. Sprawdź czy plik istnieje:
   ```powershell
   Test-Path "$env:APPDATA\openlp\data\songs.sqlite"
   # lub jeśli używasz niestandardowej ścieżki:
   Test-Path "C:\Users\Dominik\AppData\Roaming\openlp\data\songs.sqlite"
   ```
2. Sprawdź rozmiar pliku:
   ```powershell
   (Get-Item "$env:APPDATA\openlp\data\songs.sqlite").Length
   ```
3. Otwórz plik w DB Browser for SQLite i sprawdź zawartość

### Problem: Błąd "OpenLP jest uruchomiony"

**Rozwiązanie:**

- Zamknij OpenLP całkowicie
- Sprawdź w Menedżerze zadań czy proces `OpenLP.exe` nie działa w tle
- Uruchom skrypt ponownie

## Weryfikacja kompatybilności z OpenLP

### Test kompatybilności formatu

1. **Eksportuj bazę z OpenLP** (jeśli masz istniejącą):
   - Otwórz OpenLP
   - Skopiuj plik `songs.sqlite` do lokalizacji testowej

2. **Porównaj strukturę**:

   ```powershell
   # Sprawdź strukturę tabeli w oryginalnym pliku
   sqlite3 "oryginalny-songs.sqlite" ".schema songs"

   # Sprawdź strukturę tabeli w wyeksportowanym pliku
   sqlite3 "test-songs.sqlite" ".schema songs"
   ```

3. **Sprawdź format XML w lyrics**:

   ```powershell
   # Pokaż przykładowy XML
   sqlite3 test-songs.sqlite "SELECT lyrics FROM songs LIMIT 1;"
   ```

   Powinien wyglądać tak:

   ```xml
   <verse label="v1">Tekst wersu 1</verse><verse label="v2">Tekst wersu 2</verse>
   ```

### Test w OpenLP

1. **Zrób kopię zapasową** istniejącej bazy OpenLP:
   ```powershell
   Copy-Item "$env:APPDATA\openlp\data\songs.sqlite" "$env:APPDATA\openlp\data\songs.sqlite.backup"
   ```
2. **Zastąp plik** wyeksportowanym plikiem (użyj skryptu synchronizacji)
3. **Otwórz OpenLP** i sprawdź:
   - Czy piosenki są widoczne
   - Czy można je otworzyć
   - Czy wersy są poprawnie wyświetlane
   - Czy wyszukiwanie działa

## Test automatycznego uruchamiania

1. **Skonfiguruj automatyczne uruchamianie**:

   ```powershell
   .\setup-autostart.ps1
   ```

2. **Przetestuj zadanie**:

   ```powershell
   # Uruchom zadanie ręcznie
   Start-ScheduledTask -TaskName "OpenLP Database Sync"

   # Sprawdź historię
   # Otwórz Harmonogram zadań i sprawdź historię zadania
   ```

3. **Zrestartuj komputer** i sprawdź czy synchronizacja uruchomiła się automatycznie

## Checklist testowy

- [ ] API odpowiada na `GET /api/songs`
- [ ] Endpoint `/api/songs/export/sqlite` zwraca plik SQLite
- [ ] Plik SQLite jest prawidłowy (sprawdź magic bytes)
- [ ] Plik SQLite zawiera piosenki z MongoDB
- [ ] Struktura tabeli `songs` jest zgodna z OpenLP
- [ ] Kolumna `lyrics` zawiera XML z wersami
- [ ] Skrypt synchronizacji działa poprawnie
- [ ] OpenLP może otworzyć zsynchronizowaną bazę
- [ ] Piosenki są widoczne w OpenLP
- [ ] Wersy są poprawnie wyświetlane
- [ ] Automatyczne uruchamianie działa (opcjonalnie)

## Następne kroki po testach

Jeśli wszystkie testy przeszły pomyślnie:

1. ✅ Skonfiguruj automatyczne uruchamianie (jeśli potrzebne)
2. ✅ Zaktualizuj URL API w skrypcie (jeśli używasz zdalnego serwera)
3. ✅ Przetestuj na komputerze zborowym
4. ✅ Przekaż instrukcje użytkownikom
