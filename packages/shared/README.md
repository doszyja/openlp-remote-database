# @openlp/shared

Shared TypeScript types and DTOs for the OpenLP Database Sync project.

## Usage

```typescript
import { Song, Verse, Tag } from '@openlp/shared';
import { CreateSongDto, UpdateSongDto } from '@openlp/shared/dto';
import { PaginatedResponseDto } from '@openlp/shared/dto';
```

## Types

- `Song` - Main song interface
- `Verse` - Verse interface
- `Tag` - Tag interface
- `OpenLPMapping` - OpenLP sync mapping

## DTOs

- `CreateSongDto` - For creating new songs
- `UpdateSongDto` - For updating existing songs
- `SongResponseDto` - API response format
- `PaginatedResponseDto<T>` - Paginated API responses
- `SongQueryDto` - Query parameters for listing songs

## Building

```bash
pnpm build
```

## Development

This package is part of the monorepo and uses the root TypeScript configuration.
