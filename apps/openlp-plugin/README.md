# OpenLP Sync Plugin

Wtyczka OpenLP, która dodaje przycisk "Synchronizuj" do interfejsu OpenLP. Przycisk pobiera wszystkie pieśni z API backendu i aktualizuje bazę danych OpenLP.

## Instalacja

### Wymagania

- OpenLP 3.0 lub nowszy
- Python 3.6+

### Kroki instalacji

1. **Sklonuj lub pobierz repozytorium**

2. **Znajdź folder wtyczek OpenLP**:
   - **Linux**: `~/.openlp/plugins/`
   - **Windows**: `%APPDATA%\OpenLP\plugins\` lub `C:\Users\<username>\AppData\Roaming\OpenLP\plugins\`
   - **macOS**: `~/Library/Application Support/OpenLP/plugins/`

3. **Skopiuj folder wtyczki**:

   ```bash
   cp -r apps/openlp-plugin/openlp_sync_plugin <OPENLP_PLUGINS_DIR>/
   ```

4. **Uruchom OpenLP** i przejdź do:
   - `Ustawienia` → `Zarządzaj wtyczkami` (lub `Alt+F7`)
   - Znajdź "OpenLP Sync Plugin" i włącz go

## Konfiguracja

Po pierwszym uruchomieniu wtyczki, skonfiguruj następujące ustawienia:

1. **URL API**: Adres Twojego backend API (np. `http://localhost:3000/api`)
2. **Klucz API** (opcjonalnie): Jeśli API wymaga autoryzacji
3. **Ścieżka do bazy danych**: Ścieżka do pliku `songs.sqlite` OpenLP (zwykle wykrywana automatycznie)

Ustawienia można zmienić w:

- `Ustawienia` → `Wtyczki` → `OpenLP Sync Plugin`

## Użycie

1. Otwórz OpenLP
2. W menu `Narzędzia` znajdź opcję "Synchronizuj"
3. Kliknij "Synchronizuj"
4. Poczekaj na zakończenie synchronizacji

Podczas synchronizacji zobaczysz:

- Postęp operacji
- Liczbę utworzonych pieśni
- Liczbę zaktualizowanych pieśni
- Liczbę błędów (jeśli wystąpiły)

## Jak to działa

1. Wtyczka łączy się z Twoim backend API
2. Pobiera wszystkie pieśni z API (z paginacją)
3. Dla każdej pieśni:
   - Sprawdza, czy pieśń już istnieje w bazie OpenLP (na podstawie ID w polu `comments`)
   - Jeśli istnieje - aktualizuje
   - Jeśli nie istnieje - tworzy nową
4. Zapisuje backend ID w polu `comments` jako JSON dla przyszłych synchronizacji

## Format danych

Wtyczka oczekuje, że API zwraca pieśni w następującym formacie:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Tytuł pieśni",
      "number": "123",
      "chorus": "Tekst refrenu",
      "verses": "Tekst zwrotek",
      "copyright": "Copyright info",
      "ccliNumber": "12345"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5
  }
}
```

## Rozwiązywanie problemów

### Wtyczka nie pojawia się w OpenLP

- Sprawdź, czy folder wtyczki jest w prawidłowej lokalizacji
- Sprawdź, czy wszystkie pliki są obecne
- Sprawdź logi OpenLP pod kątem błędów

### Błąd połączenia z API

- Sprawdź, czy URL API jest poprawny
- Sprawdź, czy API jest dostępne
- Sprawdź, czy klucz API (jeśli wymagany) jest poprawny

### Błąd dostępu do bazy danych

- Sprawdź, czy ścieżka do bazy danych jest poprawna
- Sprawdź, czy OpenLP nie jest otwarty (baza może być zablokowana)
- Sprawdź uprawnienia do pliku bazy danych

## Rozwój

### Struktura projektu

```
openlp_sync_plugin/
├── __init__.py          # Inicjalizacja wtyczki
├── plugin.py            # Główna klasa wtyczki
├── api_client.py        # Klient API
└── sync_service.py      # Serwis synchronizacji
```

### Testowanie

1. Uruchom OpenLP w trybie deweloperskim
2. Dodaj wtyczkę do folderu wtyczek
3. Włącz wtyczkę w OpenLP
4. Przetestuj synchronizację

## Licencja

MIT License - zobacz główny plik LICENSE w repozytorium.
