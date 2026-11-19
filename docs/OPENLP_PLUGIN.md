# OpenLP Song Stats plugin (contrib)

Community plugin under `contrib/plugins/songstats` synchronizes the local OpenLP song database with **Openlp-database** and records live presentation statistics.

## Production API base

Example deployment:

- **API:** `https://piesni.swietochlowicekwch.pl/api`
- **Web (login):** `https://piesni.swietochlowicekwch.pl`

In OpenLP **Configure → Song Stats**:

| Setting | Value |
|--------|--------|
| API base URL | `https://piesni.swietochlowicekwch.pl/api` |
| Stats endpoint | *(leave empty — defaults to `{API base}/presentation-events`)* |
| Church / site ID | **`id` użytkownika z `GET /api/auth/me`** (MongoDB) — plugin ustawia to jako `clientId` w statystykach i w `openlpMapping` przy pushu |

Pull (web / anonymous):

- `GET /api/songs/all` — lightweight cache for the web app
- `GET /api/songs/export/sqlite` — full SQLite export (public; nginx `proxy_read_timeout` 180s)

Pull (OpenLP desktop plugin, JWT + Discord edit/admin role):

- `GET /api/songs/all-openlp` — JSON merge (`lyricsXml` = SQLite `songs.lyrics` document)

Push (JWT + Discord edit role):

- **`PUT /api/songs/openlp/save`** — preferred desktop upsert (optional Mongo `id`, else `songstats:remote_id` in `comments` or title/number)
- `POST /api/songs`, `PATCH /api/songs/:id` — legacy/alternate

Each push/create:

- Bumps the global catalog version (`GET /songs/version`) for incremental sync.
- Appends a **song revision** snapshot (full title, verses, `lyricsXml`, `verseOrder`, tags, songbook, OpenLP mapping) before each update.
- Writes an **audit log** entry with the **same action and metadata** as the web editor (`SONG_CREATE` / `SONG_EDIT`: `catalogVersion`, `storedRevision`, `clientId`, `openlpId`, field-level `changes`; `metadata.source` remains `openlp`).

In the web app, open **Historia** on a song or `/songs/:id/history` to compare revisions and **Przywróć** (edit permission).

## Install on Windows

From the OpenLP `contrib` folder:

```powershell
.\install.ps1
```

Restart OpenLP; enable **Song Stats** under **Tools → Configure**.

## Browser login (OpenLP desktop)

1. In Song Stats settings, click **Połącz z kontem (przeglądarka)**.
2. The browser opens `{web}/auth/openlp?port=8765&state=…`.
3. Log in with Discord (same guild/roles as the web app).
4. The page redirects to `http://127.0.0.1:8765/callback?code=…`.
5. The plugin exchanges the code at `POST /api/auth/openlp/token` and stores the JWT.

**Disconnect (browser):** the plugin opens `{web}/auth/openlp/logout?port=8765&from=openlp` (or `?from=openlp` only). The page always clears the web session. If `port` is present—or was saved during login in the browser—it also redirects to `http://127.0.0.1:{port}/callback?logout=1&from=openlp`. Without a port, the user sees a success message and can close the tab (plugin token may still need clearing inside OpenLP).

Re-login when push returns **401**.

## Sync workflow

**Tools → Synchronize songs with API:**

1. Download master catalog (`GET /songs/all-openlp`).
2. Match locally by Mongo `id` in comments (`songstats:remote_id=…`), then `openlpMapping.openlpId`, then CCLI/title.
3. Optionally upload local songs (`POST`/`PATCH`) when bidirectional sync is enabled.

## Live statistics

When a song goes live, the plugin `POST`s to `/api/presentation-events` with `clientId` set to the operator's **`id` from `GET /api/auth/me`**, plus `openlpSongId`, `mongoSongId`, `title`, `presentedAt`. The API looks up `users._id` (and falls back to `users.discordId` if needed) and stores `viewerUserId`, `viewerUsername`, `viewerDiscordId`. Older events: `POST /api/presentation-events/backfill-viewer-identity` (edit permission).

View aggregates in the web app: **menu → Statystyki odsłon** (`/stats`, edit permission required). Events include **OpenLP** (live presentation, attributed to Discord operator) and **Przeglądarka** (song detail, presentation mode, live view) with device/browser/timezone metadata — no extra browser permissions required. **Anonymous** visitors are tracked too (`POST /presentation-events/browser` is public); identity is the browser tab `sessionId` until someone logs in. Use **Grupuj wg → Użytkownik** to see counts per operator (browser anon = **Anonimowy** / session prefix). The ranking table and the event log are both paginated (25 rows per page on `/stats`) so large histories are not loaded in one response.

## JSON vs SQLite

| Mode | Use when |
|------|-----------|
| JSON | Production default; merge updates |
| SQLite | One-off bulk import; risk of duplicates |

## Related docs

- Field mapping: `docs/OPENLP_FIELD_MAPPING.md`
- SQLite install notes: `docs/SYNC_SQLITE_INSTALLATION.md`