# LanguageTool (Docker)

Kontener proofreadingu dla raportu literówek (`/reports/spellcheck`).

- Obraz: [meyay/languagetool](https://hub.docker.com/r/meyay/languagetool) (community, wskazany przez LanguageTool)
- API w sieci Docker: `http://languagetool:8081/v2/check`
- **Nie** wystawiamy portu 8081 na świat — tylko sieć wewnętrzna + opcjonalnie `127.0.0.1:8081` do debugu lokalnego

## RAM

Zarezerwuj ok. **1,5–2 GiB** RAM dla kontenera (JVM + słowniki PL).

## N-gramy (opcjonalnie)

Lepsza detekcja błędów w długich tekstach — duży pierwszy download. Domyślnie **wyłączone**.
Aby włączyć PL, odkomentuj wolumeny i `download_ngrams_for_langs` w `docker-compose.yml`.