# Raport literówek w tekście pieśni

## Cel

Osobna podstrona w aplikacji web (`/reports/spellcheck`) pokazuje potencjalne literówki w tekście wersów pieśni. Skan idzie przez **własny** serwer LanguageTool w Dockerze.

## Silnik

- **LanguageTool** w kontenerze `meyay/languagetool:latest` (`docker-compose.yml`)
- Endpoint: `http://languagetool:8081/v2/check` (sieć Docker)
- **Brak** publicznego API LanguageTool / LanguageTool Plus — backend odrzuci URL chmurowy

### Docker

```bash
# Produkcja (cały stack)
docker compose up -d languagetool api

# Dev — tylko LT + Mongo
docker compose -f docker-compose.dev.yml up -d languagetool mongodb
```

Lokalny Nest: `LANGUAGETOOL_API_URL=http://127.0.0.1:8081/v2/check` w `apps/api/.env`

Szczegóły RAM / n-gramy: `docker/languagetool/README.md`

### Zmienne

| Zmienna | Domyślnie (Docker prod) | Opis |
|---------|-------------------------|------|
| `LANGUAGETOOL_API_URL` | `http://languagetool:8081/v2/check` | Endpoint `/v2/check` (obowiązkowo self-hosted) |
| `SPELLCHECK_LT_DELAY_MS` | `0` | Opcjonalna pauza między pieśniami (ms) |
| `SPELLCHECK_DEFAULT_LANGUAGE` | z języka pieśni | np. `pl-PL` |

## API (NestJS)

| Metoda | Ścieżka | Uprawnienia |
|--------|---------|-------------|
| `GET` | `/api/spellcheck/report` | JWT (każdy zalogowany użytkownik Discord) |

Query:

- `cursor` — paginacja po `_id` pieśni
- `batchSize` — 1–50 (domyślnie 25)
- `songbook` — filtr śpiewnika
- `language` — np. `pl-PL`
- `totalScanned` — licznik skumulowany z poprzednich partii (frontend)

## Frontend

- Trasa: `/reports/spellcheck`
- Menu użytkownika (po zalogowaniu): **Raport literówek**; kafelek na stronie głównej
- Skan: **Partia**, **Kolejna partia**, **Skan do końca**
- Wyniki: wyszukiwanie, filtry, sortowanie, paginacja, eksport CSV

## Ograniczenia

- Wydajność zależy od RAM/CPU kontenera LT (~2 GiB)
- Fałszywe trafienia: biblia, imiona, archaizmy, skróty
- W raporcie tylko trafienia **z co najmniej jedną propozycją poprawki**
- Ignorowane znaczniki powtórzeń: `x2`, `x3`, …
- Tagi formatowania OpenLP są usuwane przed sprawdzeniem

## Pliki

- `apps/api/src/spellcheck/`
- `apps/web/src/pages/SpellcheckReportPage.tsx`
- `packages/shared/src/types/spellcheck-report.ts`