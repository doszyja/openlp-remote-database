# OpenLP .osz Format Documentation

## Overview

Pliki `.osz` w OpenLP to archiwa ZIP zawierające plik `.osj` w formacie JSON, który opisuje zapisany plan nabożeństwa.

## Struktura pliku .osz

1. **Archiwum ZIP** - standardowy format ZIP
2. **Plik .osj** - JSON z danymi planu nabożeństwa

## Struktura JSON (.osj)

Plik `.osj` to tablica obiektów:

```json
[
  {
    "openlp_core": {
      "lite-service": false,
      "service-theme": null,
      "openlp-servicefile-version": 3
    }
  },
  {
    "serviceitem": {
      "header": {
        "name": "songs",
        "plugin": "songs",
        "theme": null,
        "title": "6. Ja śpiewam Panu",
        "footer": ["6. Ja śpiewam Panu"],
        "type": 1,
        "audit": ["6. Ja śpiewam Panu", [], null, "None"],
        "notes": "",
        "from_plugin": true,
        "capabilities": [2, 1, 5, 8, 9, 13, 22],
        "search": "",
        "data": {
          "title": "6. ja śpiewam panu",
          "alternate_title": null,
          "authors": "",
          "ccli_number": null,
          "copyright": null
        },
        "xml_version": "<?xml version='1.0' encoding='UTF-8'?>...",
        "auto_play_slides_once": false,
        "auto_play_slides_loop": false,
        "timed_slide_interval": 0,
        "start_time": 0,
        "end_time": 0,
        "media_length": 0,
        "background_audio": [],
        "theme_overwritten": false,
        "will_auto_start": false,
        "processor": null,
        "metadata": [],
        "sha256_file_hash": null,
        "stored_filename": null
      },
      "data": [
        {
          "title": "Ja śpiewam Panu memu, śpiewam ",
          "raw_slide": "Ja śpiewam Panu memu, śpiewam cały dzień.\nŚpiewam o miłości tej, której nie zna świat...",
          "verseTag": "Z1"
        },
        {
          "title": "Ja śpiewam chociaż nieraz cięż",
          "raw_slide": "Ja śpiewam chociaż nieraz ciężka droga ma...",
          "verseTag": "Z2"
        }
      ]
    }
  }
]
```

## Elementy struktury

### 1. openlp_core (pierwszy element)

Metadane OpenLP:

- `lite-service`: boolean - czy to lite service
- `service-theme`: string | null - motyw planu
- `openlp-servicefile-version`: number - wersja formatu (obecnie 3)

### 2. serviceitem (kolejne elementy)

Każdy element planu (pieśń, biblia, custom, etc.) to obiekt `serviceitem`:

#### header

Metadane elementu:

- `name`: string - nazwa pluginu (dla pieśni: "songs")
- `plugin`: string - identyfikator pluginu ("songs")
- `theme`: string | null - motyw
- `title`: string - tytuł elementu (np. tytuł pieśni)
- `footer`: string[] - footer (zwykle [title])
- `type`: number - typ elementu (1 = pieśń)
- `audit`: array - informacje audytu [title, [], null, "None"]
- `notes`: string - notatki
- `from_plugin`: boolean - czy z pluginu
- `capabilities`: number[] - możliwości elementu [2, 1, 5, 8, 9, 13, 22]
- `search`: string - tekst do wyszukiwania (lowercase)
- `data`: object - dane specyficzne dla typu:
  - `title`: string - tytuł (lowercase)
  - `alternate_title`: string | null - alternatywny tytuł
  - `authors`: string - autorzy
  - `ccli_number`: string | null - numer CCLI
  - `copyright`: string | null - copyright
- `xml_version`: string - pełny XML pieśni w formacie OpenLyrics
- `auto_play_slides_once`: boolean
- `auto_play_slides_loop`: boolean
- `timed_slide_interval`: number
- `start_time`: number
- `end_time`: number
- `media_length`: number
- `background_audio`: array
- `theme_overwritten`: boolean
- `will_auto_start`: boolean
- `processor`: any | null
- `metadata`: array
- `sha256_file_hash`: string | null
- `stored_filename`: string | null

#### data

Tablica slajdów (zwrotek):

- `title`: string - tytuł slajdu (pierwsza linia lub skrócony tekst)
- `raw_slide`: string - pełna treść slajdu (zamiast `<br/>` używa `\n`)
- `verseTag`: string - tag zwrotki (Z1, Z2, C1, B1, etc.)

## Implementacja

Funkcja `exportServicePlanToOsz()` w `apps/api/src/service-plan/utils/export-service-plan.util.ts` generuje plik `.osz` zgodny z tym formatem.

## Uwagi

- Format może różnić się między wersjami OpenLP
- Pliki `.osz` mogą zawierać dodatkowe pliki multimedialne w archiwum ZIP
- Format `.osj` nie jest oficjalnie udokumentowany - struktura została zdekodowana z rzeczywistych plików OpenLP
