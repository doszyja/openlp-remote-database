import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

const panelBase = {
  p: 1.25,
  borderRadius: 1,
  fontSize: '0.875rem',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  maxHeight: 420,
  overflow: 'auto',
  border: 1,
  borderColor: 'divider',
};

export function DiffTwoColumns({
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: { xs: 1.5, md: 2 },
        alignItems: 'stretch',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, display: 'block', mb: 0.75, color: 'error.main' }}
        >
          {leftLabel}
        </Typography>
        <Box
          sx={{
            ...panelBase,
            bgcolor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.06)',
          }}
        >
          {left}
        </Box>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, display: 'block', mb: 0.75, color: 'success.main' }}
        >
          {rightLabel}
        </Typography>
        <Box
          sx={{
            ...panelBase,
            bgcolor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.12)' : 'rgba(46, 125, 50, 0.06)',
          }}
        >
          {right}
        </Box>
      </Box>
    </Box>
  );
}

export function diffSimpleSideBySide(
  leftLabel: string,
  rightLabel: string,
  oldVal: unknown,
  newVal: unknown,
) {
  const oldStr = oldVal === null || oldVal === undefined ? '(brak)' : String(oldVal);
  const newStr = newVal === null || newVal === undefined ? '(brak)' : String(newVal);
  if (oldStr === newStr) {
    return (
      <Typography variant="body2" color="text.secondary">
        Brak zmian
      </Typography>
    );
  }
  return <DiffTwoColumns leftLabel={leftLabel} rightLabel={rightLabel} left={oldStr} right={newStr} />;
}

type Verse = {
  order: number;
  content: string;
  label?: string;
  originalLabel?: string;
};

export function formatVersesBlock(verses: unknown): string {
  if (!Array.isArray(verses) || verses.length === 0) return '(brak zwrotek)';
  return (verses as Verse[])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((v, i) => {
      const head = v.label || v.originalLabel || `Zwrotka ${v.order ?? i + 1}`;
      return `${head}\n${v.content || ''}`.trim();
    })
    .join('\n\n');
}

export function diffVersesSideBySide(
  leftLabel: string,
  rightLabel: string,
  oldVerses: unknown,
  newVerses: unknown,
) {
  const left = formatVersesBlock(oldVerses);
  const right = formatVersesBlock(newVerses);
  if (left === right) {
    return (
      <Typography variant="body2" color="text.secondary">
        Brak zmian w zwrotkach
      </Typography>
    );
  }
  return <DiffTwoColumns leftLabel={leftLabel} rightLabel={rightLabel} left={left} right={right} />;
}

export function diffTextLinesSideBySide(
  leftLabel: string,
  rightLabel: string,
  oldText: string,
  newText: string,
) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const max = Math.max(oldLines.length, newLines.length);

  if (oldText.trim() === newText.trim()) {
    return (
      <Typography variant="body2" color="text.secondary">
        Brak zmian
      </Typography>
    );
  }

  const rows: { old: string; new: string; changed: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    const o = oldLines[i] ?? '';
    const n = newLines[i] ?? '';
    rows.push({ old: o, new: n, changed: o !== n });
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 1.5, md: 2 },
          mb: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
          {leftLabel}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
          {rightLabel}
        </Typography>
      </Box>
      <Box
        sx={{
          maxHeight: 480,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {rows.map((row, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              borderBottom: idx < rows.length - 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                minHeight: '1.5em',
                bgcolor: row.changed
                  ? theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(211, 47, 47, 0.18)'
                        : 'rgba(211, 47, 47, 0.08)'
                  : 'transparent',
                color: row.changed ? 'error.main' : 'text.primary',
              }}
            >
              {row.old || '\u00a0'}
            </Box>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                minHeight: '1.5em',
                borderLeft: { xs: 0, md: 1 },
                borderColor: 'divider',
                bgcolor: row.changed
                  ? theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(46, 125, 50, 0.18)'
                        : 'rgba(46, 125, 50, 0.08)'
                  : 'transparent',
                color: row.changed ? 'success.dark' : 'text.primary',
              }}
            >
              {row.new || '\u00a0'}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function diffTagsSideBySide(
  leftLabel: string,
  rightLabel: string,
  oldTags: unknown,
  newTags: unknown,
) {
  const fmt = (tags: unknown) => {
    if (!Array.isArray(tags) || tags.length === 0) return '(brak)';
    return tags
      .map((t: { name?: string } | string) => (typeof t === 'string' ? t : t.name ?? ''))
      .filter(Boolean)
      .sort()
      .join(', ');
  };
  const left = fmt(oldTags);
  const right = fmt(newTags);
  if (left === right) {
    return (
      <Typography variant="body2" color="text.secondary">
        Brak zmian w tagach
      </Typography>
    );
  }
  return <DiffTwoColumns leftLabel={leftLabel} rightLabel={rightLabel} left={left} right={right} />;
}