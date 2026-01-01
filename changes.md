# OpenLP Database Sync - Lista funkcjonalności i zmian

**Ostatnia aktualizacja**: 2025-01-01

---

## 📱 Główne funkcjonalności

### Aplikacja webowa (Frontend)

#### Zarządzanie pieśniami

- ✅ **Przeglądanie pieśni** - Lista wszystkich pieśni z wyszukiwaniem i filtrowaniem
- ✅ **Szczegóły pieśni** - Widok szczegółowy z pełnym tekstem i metadanymi
- ✅ **Tworzenie pieśni** - Formularz do dodawania nowych pieśni
- ✅ **Edycja pieśni** - Pełna edycja tytułu, tekstu, kolejności wersów
- ✅ **Usuwanie pieśni** - Z potwierdzeniem i soft-delete
- ✅ **Duplikowanie pieśni** - Kopiowanie istniejącej pieśni
- ✅ **Eksport ZIP** - Pobieranie wszystkich pieśni w formacie OpenLP XML

#### Edytor wersów

- ✅ **Indywidualne pola tekstowe** dla każdego wersu
- ✅ **Typy wersów**: zwrotka (v), refren (c), bridge (b), pre-chorus (p), tag (t)
- ✅ **Kolejność wersów** - Edytowalny string (np. "v1 c1 v2 c1 v3")
- ✅ **Dodawanie/usuwanie wersów** - Dynamiczne zarządzanie
- ✅ **Przesuwanie wersów** - Góra/dół strzałkami
- ✅ **Parsowanie XML** - Import z formatu OpenLP

#### Wyszukiwanie i nawigacja

- ✅ **Debounced search** - Wyszukiwanie z opóźnieniem 300ms
- ✅ **Wyszukiwanie w tekście** - Pełnotekstowe wyszukiwanie w tytule i tekście
- ✅ **Lista boczna** - Panel z listą pieśni na desktopie
- ✅ **Sortowanie A-Z / Z-A** - Przełączanie kolejności
- ✅ **Podświetlanie aktualnej pieśni** - Wyróżnienie w liście
- ✅ **Auto-scroll** - Automatyczne przewijanie do wybranej pieśni

#### Responsywność i UX

- ✅ **Mobile-first design** - Optymalizacja dla telefonów
- ✅ **Dark/Light mode** - Przełączanie motywu
- ✅ **Pełny ekran** - Tryb prezentacji pieśni
- ✅ **Powiadomienia toast** - Komunikaty sukcesu/błędu
- ✅ **Sticky navigation** - Przylepny pasek nawigacji
- ✅ **PWA ready** - Możliwość instalacji jako aplikacja

#### Plan nabożeństwa (Service Plan)

- ✅ **Tworzenie planów** - Lista pieśni na nabożeństwo
- ✅ **Drag & drop** - Zmiana kolejności pieśni
- ✅ **Widok prezentacji** - Tryb live z nawigacją między wersami
- ✅ **Nawigacja klawiszowa** - Strzałki, Enter, Escape

---

### Backend API

#### Endpointy CRUD

- ✅ `GET /songs` - Lista pieśni (paginacja, filtry, wyszukiwanie)
- ✅ `GET /songs/:id` - Szczegóły pieśni
- ✅ `POST /songs` - Tworzenie pieśni
- ✅ `PATCH /songs/:id` - Aktualizacja pieśni
- ✅ `DELETE /songs/:id` - Soft delete pieśni
- ✅ `GET /songs/export/zip` - Eksport wszystkich pieśni jako ZIP

#### Wyszukiwanie

- ✅ `GET /songs/search` - Pełnotekstowe wyszukiwanie
- ✅ Wyszukiwanie w tytule i tekście
- ✅ Paginacja wyników

#### Bezpieczeństwo

- ✅ **Discord OAuth** - Logowanie przez Discord
- ✅ **JWT tokens** - Autoryzacja requestów
- ✅ **Role-based access** - Edycja tylko dla uprawnionych
- ✅ **Rate limiting** - Ograniczenie liczby requestów
- ✅ **CORS** - Konfiguracja dozwolonych origin
- ✅ **Helmet** - Bezpieczne nagłówki HTTP
- ✅ **Audit logging** - Logowanie wszystkich zmian

#### Import/Export

- ✅ **OpenLP import** - Migracja z bazy SQLite OpenLP
- ✅ **ZIP export** - Eksport pieśni w formacie XML OpenLP

---

### Narzędzie synchronizacji (Sync CLI)

#### Komendy

- ✅ `sync` - Pełna synchronizacja backend → OpenLP
- ✅ `sync-song <id>` - Synchronizacja pojedynczej pieśni
- ✅ `list` - Lista pieśni z backendu

#### Opcje

- ✅ `--dry-run` - Podgląd zmian bez zapisywania
- ✅ `--verbose` - Szczegółowe logi
- ✅ `--force` - Wymuszenie aktualizacji wszystkich pieśni

#### Funkcjonalność

- ✅ **One-way sync** - Backend → OpenLP SQLite
- ✅ **UUID mapping** - Śledzenie ID między systemami
- ✅ **Reconciliation** - Wykrywanie zmian (insert/update/delete)
- ✅ **Progress reporting** - Podsumowanie synchronizacji
- ✅ **Error handling** - Kontynuacja po błędach

---

### Plugin OpenLP

- ✅ **Przycisk "Synchronizuj"** - Natywny przycisk w OpenLP
- ✅ **Konfiguracja URL** - Ustawienia serwera API
- ✅ **Status synchronizacji** - Feedback dla użytkownika
- ✅ **Automatyczna instalacja** - Skrypt instalacyjny

---

## 🔄 Ostatnie zmiany

### Styczeń 2025

#### Naprawione błędy TypeScript

- ✅ Naprawiono błąd `calculateHeight` - usunięto nieużywany prop z `SongList`
- ✅ Naprawiono błąd typowania w `useDuplicateSong.ts` - poprawna asercja typów dla `verses`
- ✅ Naprawiono błąd w `LivePage.tsx` - obsługa verses jako string i array

#### Ulepszenia UX

- ✅ Usunięto zbędne pola z formularza pieśni (Chorus, Tags, Number)
- ✅ Dodano responsywne układy przycisków (stos na mobile, rząd na desktop)
- ✅ Naprawiono problemy z overflow na mobile
- ✅ Optymalizacja React Query - brak "mrugnięć" podczas nawigacji

#### Edytor wersów

- ✅ Implementacja parsowania XML z OpenLP
- ✅ Indywidualne pola edycji dla każdego wersu
- ✅ Wybór typu wersu (zwrotka/refren/bridge/pre-chorus/tag)
- ✅ Edytowalny string kolejności wersów
- ✅ Obsługa powtórzeń w verse order

#### System powiadomień

- ✅ Globalny NotificationContext z Material UI Snackbar
- ✅ Powiadomienia sukces/błąd we wszystkich stronach
- ✅ Pozycjonowanie góra-środek z 3s auto-dismiss

#### Plan nabożeństwa

- ✅ Widok prezentacji z nawigacją między wersami
- ✅ Obsługa klawiatury (strzałki, Enter, Escape)
- ✅ Drag & drop do zmiany kolejności

---

## 🛠️ Stos technologiczny

### Frontend

| Technologia     | Wersja | Opis                |
| --------------- | ------ | ------------------- |
| React           | 18     | Framework UI        |
| Vite            | 5      | Build tool          |
| TypeScript      | 5      | Język programowania |
| Material UI     | 5      | Komponenty UI       |
| React Router    | 6      | Routing             |
| React Query     | 5      | Stan serwera        |
| React Hook Form | 7      | Formularze          |

### Backend

| Technologia | Wersja | Opis        |
| ----------- | ------ | ----------- |
| NestJS      | 10     | Framework   |
| TypeScript  | 5      | Język       |
| MongoDB     | 7      | Baza danych |
| Mongoose    | 8      | ODM         |
| Passport    | -      | Autoryzacja |
| JWT         | -      | Tokeny      |

### Sync Tool

| Technologia    | Opis          |
| -------------- | ------------- |
| Node.js        | Runtime       |
| TypeScript     | Język         |
| better-sqlite3 | SQLite driver |
| axios          | HTTP client   |
| commander.js   | CLI framework |
| Vitest         | Testy         |

### DevOps

| Technologia    | Opis              |
| -------------- | ----------------- |
| Docker         | Konteneryzacja    |
| Docker Compose | Orkiestracja      |
| pnpm           | Package manager   |
| GitHub Actions | CI/CD (planowane) |

---

## 📋 Status projektu

### Faza 1 (MVP) - ~90% ukończone

| Moduł       | Status | Opis                             |
| ----------- | ------ | -------------------------------- |
| Monorepo    | ✅     | Workspace, shared types, linting |
| Backend API | ✅     | CRUD, auth, audit, export        |
| Frontend    | ✅     | Pełne CRUD, formularze, UX       |
| Sync Tool   | ✅     | CLI, dry-run, testy              |
| Docker      | ✅     | Dev i prod setup                 |

### Faza 2 - W trakcie

| Funkcjonalność   | Status |
| ---------------- | ------ |
| Error boundaries | ⏳     |
| Swagger docs     | ⏳     |
| Seed data        | ⏳     |
| CI/CD pipeline   | ⏳     |
| Mobile QA        | ⏳     |

---

## 📚 Dokumentacja

- [README.md](README.md) - Przegląd projektu
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architektura systemu
- [docs/DETAILED_TODO.md](docs/DETAILED_TODO.md) - Szczegółowa lista zadań
- [docs/PROGRESS.md](docs/PROGRESS.md) - Postęp projektu
- [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) - Konfiguracja Docker
- [docs/DISCORD_AUTH_SETUP.md](docs/DISCORD_AUTH_SETUP.md) - Konfiguracja Discord OAuth
- [docs/SYNC_TOOL.md](docs/SYNC_TOOL.md) - Dokumentacja narzędzia sync

---

## 🔗 Linki

- **Repository**: https://github.com/doszyja/openlp-remote-database
- **Frontend**: http://localhost:5173 (development)
- **Backend API**: http://localhost:3000/api (development)

---

**Autor**: Dominik Szyja  
**Licencja**: MIT
