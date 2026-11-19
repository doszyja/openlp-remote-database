import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type DiffOp = { type: 'equal' | 'delete' | 'insert'; value: string };

function tokenizeForDiff(text: string): string[] {
  if (!text) {
    return [];
  }
  return text.match(/\S+|\s+/g) ?? [text];
}

/** Word-level LCS diff (tokens = words + whitespace). */
export function computeWordDiff(oldText: string, newText: string): DiffOp[] {
  const a = tokenizeForDiff(oldText);
  const b = tokenizeForDiff(newText);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'equal', value: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'insert', value: b[j - 1] });
      j -= 1;
    } else {
      ops.push({ type: 'delete', value: a[i - 1] });
      i -= 1;
    }
  }

  ops.reverse();
  return mergeAdjacentOps(ops);
}

function mergeAdjacentOps(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.value += op.value;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}

function SideBySideDiffText({
  oldText,
  newText,
  side,
}: {
  oldText: string;
  newText: string;
  side: 'left' | 'right';
}) {
  const ops = computeWordDiff(oldText, newText);

  return (
    <>
      {ops.map((op, index) => {
        if (side === 'left' && op.type === 'insert') {
          return null;
        }
        if (side === 'right' && op.type === 'delete') {
          return null;
        }
        const highlight = side === 'left' ? op.type === 'delete' : op.type === 'insert';
        return (
          <Box
            component="span"
            key={`${side}-${index}-${op.type}`}
            sx={{
              fontWeight: highlight ? 700 : 400,
              whiteSpace: 'pre-wrap',
            }}
          >
            {op.value}
          </Box>
        );
      })}
    </>
  );
}

function InlineDiffColumns({
  leftLabel,
  rightLabel,
  oldText,
  newText,
}: {
  leftLabel: string;
  rightLabel: string;
  oldText: string;
  newText: string;
}) {
  return (
    <DiffTwoColumns
      leftLabel={leftLabel}
      rightLabel={rightLabel}
      left={<SideBySideDiffText oldText={oldText} newText={newText} side="left" />}
      right={<SideBySideDiffText oldText={oldText} newText={newText} side="right" />}
    />
  );
}

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
  return (
    <InlineDiffColumns
      leftLabel={leftLabel}
      rightLabel={rightLabel}
      oldText={oldStr}
      newText={newStr}
    />
  );
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
  return diffTextLinesSideBySide(leftLabel, rightLabel, left, right);
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
                wordBreak: 'break-word',
                minHeight: '1.5em',
                color: 'text.primary',
                bgcolor: row.changed
                  ? theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.03)'
                  : 'transparent',
              }}
            >
              {row.changed ? (
                <SideBySideDiffText oldText={row.old} newText={row.new} side="left" />
              ) : (
                row.old || '\u00a0'
              )}
            </Box>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.8125rem',
                wordBreak: 'break-word',
                minHeight: '1.5em',
                borderLeft: { xs: 0, md: 1 },
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: row.changed
                  ? theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.03)'
                  : 'transparent',
              }}
            >
              {row.changed ? (
                <SideBySideDiffText oldText={row.old} newText={row.new} side="right" />
              ) : (
                row.new || '\u00a0'
              )}
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
  return (
    <InlineDiffColumns leftLabel={leftLabel} rightLabel={rightLabel} oldText={left} newText={right} />
  );
}