# Instalacja i użycie skryptu synchronizacji SQLite

## Opis

Skrypt synchronizacji pozwala na pobranie aktualnej bazy danych piosenek z serwera API i zastąpienie lokalnej bazy danych OpenLP (`songs.sqlite`).

## Wymagania

- Windows (PowerShell 5.1 lub nowszy)
- Dostęp do internetu (lub sieci lokalnej z serwerem API)
- OpenLP musi być zamknięty podczas synchronizacji

## Instalacja

1. Skopiuj pliki na komputer zborowy:
   - `sync-sqlite.ps1` - główny skrypt PowerShell
   - `sync-sqlite.bat` - skrypt uruchamiający (opcjonalny, dla łatwiejszego uruchamiania)
   - `setup-autostart.ps1` - skrypt pomocniczy do konfiguracji automatycznego uruchamiania (opcjonalny)

2. Umieść pliki w wygodnej lokalizacji (np. na pulpicie lub w folderze OpenLP)

3. (Opcjonalnie) Skonfiguruj automatyczne uruchamianie przy starcie systemu:
   - Kliknij prawym przyciskiem na `setup-autostart.ps1`
   - Wybierz "Uruchom jako administrator"
   - Postępuj zgodnie z instrukcjami
   - Skrypt automatycznie skonfiguruje zadanie zaplanowane, które uruchomi synchronizację przy każdym starcie systemu

## Konfiguracja

Przed pierwszym użyciem możesz edytować parametry w skrypcie `sync-sqlite.ps1`:

```powershell
param(
    [string]$ApiUrl = "http://localhost:3000/api",  # URL do API
    [string]$OpenLpDbPath = "C:\Program Files\OpenLP\songs.sqlite",  # Ścieżka do bazy OpenLP
    [switch]$Backup = $true  # Czy tworzyć kopię zapasową
)
```

### Parametry

- **ApiUrl** - URL do serwera API (domyślnie: `http://localhost:3000/api`)
  - Dla serwera zdalnego: `https://twoja-domena.com/api`
  - Dla serwera lokalnego: `http://localhost:3000/api`

- **OpenLpDbPath** - Ścieżka do pliku `songs.sqlite` w OpenLP
  - Domyślnie: Automatycznie wykrywa lokalizację (`%APPDATA%\openlp\data\songs.sqlite`)
  - Jeśli OpenLP jest zainstalowane w innej lokalizacji, możesz podać ścieżkę ręcznie
  - Standardowa lokalizacja: `C:\Users\[Użytkownik]\AppData\Roaming\openlp\data\songs.sqlite`

- **Backup** - Czy tworzyć kopię zapasową przed aktualizacją (domyślnie: `$true`)

## Użycie

### Metoda 1: Uruchomienie przez plik .bat (najłatwiejsze)

1. Kliknij dwukrotnie na `sync-sqlite.bat`
2. Postępuj zgodnie z instrukcjami na ekranie

### Metoda 2: Uruchomienie przez PowerShell

1. Kliknij prawym przyciskiem na `sync-sqlite.ps1`
2. Wybierz "Uruchom w programie PowerShell"
3. Postępuj zgodnie z instrukcjami na ekranie

### Metoda 3: Uruchomienie w Git Bash / Terminal

**W Git Bash:**

```bash
./sync-sqlite.sh
# lub bezpośrednio:
powershell.exe -ExecutionPolicy Bypass -File "./sync-sqlite.ps1"
```

**W PowerShell:**

```powershell
.\sync-sqlite.ps1
```

### Metoda 3: Uruchomienie z parametrami

```powershell
# Z niestandardowym URL API
.\sync-sqlite.ps1 -ApiUrl "https://twoja-domena.com/api"

# Z niestandardową ścieżką do bazy OpenLP
.\sync-sqlite.ps1 -OpenLpDbPath "D:\OpenLP\songs.sqlite"

# Bez tworzenia kopii zapasowej
.\sync-sqlite.ps1 -Backup:$false

# Tryb cichy (bez interakcji użytkownika - dla automatycznego uruchamiania)
.\sync-sqlite.ps1 -Silent

# Wszystkie parametry razem
.\sync-sqlite.ps1 -ApiUrl "https://twoja-domena.com/api" -OpenLpDbPath "D:\OpenLP\songs.sqlite" -Backup:$false -Silent
```

**Uwaga**: Parametr `-Silent` jest automatycznie używany przez skrypt `setup-autostart.ps1` przy konfiguracji automatycznego uruchamiania. W trybie cichym skrypt nie czeka na naciśnięcie Enter i nie wyświetla monitów dla użytkownika.

## Proces synchronizacji

1. **Sprawdzenie OpenLP** - Skrypt sprawdza, czy OpenLP jest zamknięty
2. **Kopia zapasowa** - Jeśli włączona, tworzy kopię zapasową istniejącej bazy danych
3. **Pobieranie** - Pobiera aktualną bazę danych z serwera API
4. **Weryfikacja** - Sprawdza, czy pobrany plik jest prawidłowym plikiem SQLite
5. **Aktualizacja** - Zastępuje lokalną bazę danych nową wersją
6. **Zakończenie** - Informuje o powodzeniu operacji

## Rozwiązywanie problemów

### Błąd: "OpenLP jest uruchomiony"

**Rozwiązanie:** Zamknij OpenLP całkowicie i uruchom skrypt ponownie.

### Błąd: "Katalog OpenLP nie istnieje"

**Rozwiązanie:**

- Skrypt automatycznie wykrywa standardową lokalizację OpenLP (`%APPDATA%\openlp\data\songs.sqlite`)
- Jeśli OpenLP jest w innej lokalizacji, podaj ścieżkę ręcznie:
  ```powershell
  .\sync-sqlite.ps1 -OpenLpDbPath "D:\OpenLP\songs.sqlite"
  ```

### Błąd: "Nie można zastąpić pliku"

**Rozwiązanie:**

- Upewnij się, że OpenLP jest zamknięty
- Sprawdź, czy masz uprawnienia do zapisu w katalogu OpenLP
- Uruchom PowerShell jako administrator

### Błąd: "Kod odpowiedzi HTTP: 404"

**Rozwiązanie:** Sprawdź, czy URL API jest poprawny. Upewnij się, że endpoint `/songs/export/sqlite` jest dostępny.

### Błąd: "Kod odpowiedzi HTTP: 500"

**Rozwiązanie:** Problem po stronie serwera. Skontaktuj się z administratorem.

### Błąd: "Pobrany plik nie jest prawidłowym plikiem SQLite"

**Rozwiązanie:** Serwer zwrócił nieprawidłowy plik. Sprawdź logi serwera lub skontaktuj się z administratorem.

## Bezpieczeństwo

- Skrypt tworzy automatyczną kopię zapasową przed aktualizacją (jeśli włączona)
- Kopie zapasowe są przechowywane w tym samym katalogu co baza danych z datą i czasem w nazwie
- Stare kopie zapasowe można bezpiecznie usunąć po weryfikacji, że nowa baza działa poprawnie

## Automatyzacja

### Uruchamianie przy starcie systemu

Aby skrypt uruchamiał się automatycznie przy każdym starcie systemu Windows:

#### Metoda 1: Harmonogram zadań (Zalecana)

1. Otwórz **Harmonogram zadań** (Task Scheduler):
   - Naciśnij `Win + R`
   - Wpisz `taskschd.msc` i naciśnij Enter
   - Lub znajdź w menu Start: "Harmonogram zadań"

2. Kliknij **Utwórz zadanie...** (Create Task) w panelu po prawej

3. W zakładce **Ogólne** (General):
   - **Nazwa**: `OpenLP Database Sync`
   - **Opis**: `Automatyczna synchronizacja bazy danych OpenLP przy starcie systemu`
   - Zaznacz: **Uruchom niezależnie od tego, czy użytkownik jest zalogowany** (Run whether user is logged on or not)
   - Zaznacz: **Uruchom z najwyższymi uprawnieniami** (Run with highest privileges)

4. W zakładce **Wyzwalacze** (Triggers):
   - Kliknij **Nowy...** (New...)
   - **Rozpocznij zadanie**: `Przy starcie komputera` (At startup)
   - **Włączone**: ✓
   - Kliknij **OK**

5. W zakładce **Akcje** (Actions):
   - Kliknij **Nowa...** (New...)
   - **Akcja**: `Uruchom program` (Start a program)
   - **Program/skrypt**: `powershell.exe`
   - **Dodaj argumenty**: `-ExecutionPolicy Bypass -File "C:\ścieżka\do\sync-sqlite.ps1"`
     - **WAŻNE**: Zamień `C:\ścieżka\do\` na rzeczywistą ścieżkę do skryptu
     - Przykład: `-ExecutionPolicy Bypass -File "C:\OpenLP\sync-sqlite.ps1"`
   - **Rozpocznij w**: `C:\ścieżka\do\` (folder zawierający skrypt)
   - Kliknij **OK**

6. W zakładce **Warunki** (Conditions):
   - Odznacz: **Uruchom zadanie tylko wtedy, gdy komputer jest podłączony do zasilania sieciowego**
   - Pozostaw inne opcje domyślne

7. W zakładce **Ustawienia** (Settings):
   - Zaznacz: **Uruchom zadanie tak szybko, jak to możliwe po pominięciu zaplanowanego uruchomienia**
   - Zaznacz: **Jeśli zadanie nie powiedzie się, uruchom ponownie co**: `10 minut`
   - **Próba ponownego uruchomienia maksymalnie**: `3 razy`
   - Kliknij **OK**

8. Wprowadź hasło administratora, jeśli zostaniesz o to poproszony

#### Metoda 2: Folder Autostart (Alternatywna)

1. Naciśnij `Win + R`
2. Wpisz `shell:startup` i naciśnij Enter
3. Skopiuj skrót do pliku `sync-sqlite.bat` do tego folderu
4. Kliknij prawym przyciskiem na skrót → **Właściwości**
5. W polu **Obiekt** dodaj parametry jeśli potrzebne
6. Kliknij **OK**

**Uwaga**: Ta metoda uruchomi skrypt tylko gdy użytkownik się zaloguje, nie przy starcie systemu.

### Uruchamianie o określonej porze

Możesz również skonfigurować zadanie, aby uruchamiało się o określonej porze (np. codziennie o 6:00):

1. W **Harmonogramie zadań** utwórz nowe zadanie
2. W zakładce **Wyzwalacze** wybierz:
   - **Rozpocznij zadanie**: `Według harmonogramu`
   - **Ustawienia**: `Codziennie` lub `Tygodniowo`
   - **Godzina**: wybierz odpowiednią porę
3. Skonfiguruj pozostałe ustawienia jak w Metodzie 1

### Sprawdzanie działania

Aby sprawdzić, czy zadanie działa:

1. Otwórz **Harmonogram zadań**
2. Znajdź zadanie **OpenLP Database Sync**
3. Kliknij prawym przyciskiem → **Uruchom** (Run) - aby przetestować
4. Sprawdź **Historię** (History) w panelu dolnym, aby zobaczyć logi wykonania

### Rozwiązywanie problemów z automatycznym uruchamianiem

**Problem**: Zadanie nie uruchamia się przy starcie

**Rozwiązania**:

- Sprawdź, czy ścieżka do skryptu jest poprawna
- Upewnij się, że zaznaczono "Uruchom niezależnie od tego, czy użytkownik jest zalogowany"
- Sprawdź historię zadania w Harmonogramie zadań, aby zobaczyć błędy
- Uruchom skrypt ręcznie, aby sprawdzić czy działa poprawnie
- Sprawdź uprawnienia - może być potrzebne uruchomienie jako administrator

**Problem**: Skrypt uruchamia się, ale nie może zastąpić pliku

**Rozwiązanie**:

- Zaznacz "Uruchom z najwyższymi uprawnieniami" w ustawieniach zadania
- Upewnij się, że OpenLP jest zamknięty przed synchronizacją (możesz dodać opóźnienie w skrypcie)

## Wsparcie

W razie problemów:

1. Sprawdź logi w konsoli PowerShell
2. Sprawdź, czy serwer API jest dostępny
3. Skontaktuj się z administratorem systemu
