# OpenLP slide preview (web)

## Purpose

Song presentation in the web app (`/songs/:id/presentation`, live output, and the detail-page preview) uses the same layout rules as **OpenLP 3.x themes**:

- Black background (`solid`), main lyrics area, footer with song title (like OpenLP song slides).
- Alignment and font from embedded theme XML (`apps/web/src/openlp/default-theme.xml`).
- Coordinates are scaled from OpenLP’s **1024×768** design surface.
- OpenLP **formatting tags** in lyrics (`{st}`, `{br}`, `{r}`, …) are rendered per the [formatting tags manual](https://manual.openlp.org/display_tags.html).

Implementation references OpenLP’s `theme.py` and `htmlbuilder.py` (font blocks, main/footer regions, `pre-wrap` lyrics).

## Embedded theme

`DEFAULT_OPENLP_THEME` is loaded at build time from `apps/web/src/openlp/default-theme.xml`. Replace this file (or extend `parseOpenLpThemeXml`) to match your congregation’s exported `.oth` theme.

## Components

| Piece | Path |
|-------|------|
| Theme XML (basis) | `apps/web/src/openlp/default-theme.xml` |
| Theme parser | `apps/web/src/openlp/parseOpenLpThemeXml.ts` |
| Formatting tags | `apps/web/src/openlp/openLpFormattingTags.ts` |
| Slide UI | `apps/web/src/components/OpenLpSlideDisplay.tsx` |

## Not yet mirrored

- Custom theme images / gradients from `.oth` archives (only solid background + parser hooks).
- Per-song theme overrides from service plans.
- Optional verse splits and slide transitions from OpenLP renderer.
- User-defined formatting tags from OpenLP settings (built-in tags only).