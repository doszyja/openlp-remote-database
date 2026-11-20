import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Spellcheck as SpellcheckIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FileDownload as FileDownloadIcon,
  FastForward as FastForwardIcon,
} from '@mui/icons-material';
import type { SpellcheckIssue } from '@openlp/shared';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrlForOAuth } from '../utils/apiUrl';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSpellcheckReport } from '../hooks/useSpellcheckReport';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

type SortField =
  | 'songTitle'
  | 'verse'
  | 'word'
  | 'suggestions'
  | 'message'
  | 'ruleId'
  | 'songbook';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const SCAN_BATCH_SIZE_OPTIONS = [10, 25, 50] as const;
const TABLE_BODY_MIN_HEIGHT = 380;

function songbookLabel(slug?: string): string {
  if (!slug) return '—';
  return SONGBOOK_OPTIONS.find((o) => o.slug === slug)?.label ?? slug;
}

function issueSearchHaystack(row: SpellcheckIssue): string {
  const suggestions = Array.isArray(row.suggestions) ? row.suggestions : [];
  return [
    row.songTitle,
    row.songNumber,
    row.songbook,
    songbookLabel(row.songbook),
    row.verseLabel,
    String(row.verseOrder),
    row.word,
    row.message,
    row.ruleId,
    suggestions.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function compareIssues(
  a: SpellcheckIssue,
  b: SpellcheckIssue,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc',
): number {
  const dir = sortOrder === 'asc' ? 1 : -1;
  const str = (v: string | undefined) => v ?? '';
  let cmp = 0;
  switch (sortBy) {
    case 'songTitle':
      cmp = str(a.songTitle).localeCompare(str(b.songTitle), 'pl');
      break;
    case 'songbook':
      cmp = songbookLabel(a.songbook).localeCompare(songbookLabel(b.songbook), 'pl');
      break;
    case 'verse':
      cmp = a.verseOrder - b.verseOrder;
      if (cmp === 0) {
        cmp = (a.verseLabel ?? '').localeCompare(b.verseLabel ?? '', 'pl');
      }
      break;
    case 'word':
      cmp = str(a.word).localeCompare(str(b.word), 'pl');
      break;
    case 'suggestions': {
      const aSug = Array.isArray(a.suggestions) ? a.suggestions : [];
      const bSug = Array.isArray(b.suggestions) ? b.suggestions : [];
      cmp = aSug.length - bSug.length;
      if (cmp === 0) {
        cmp = (aSug[0] ?? '').localeCompare(bSug[0] ?? '', 'pl');
      }
      break;
    }
    case 'ruleId':
      cmp = str(a.ruleId).localeCompare(str(b.ruleId));
      break;
    case 'message':
      cmp = str(a.message).localeCompare(str(b.message), 'pl');
      break;
    default:
      cmp = 0;
  }
  if (cmp === 0) {
    cmp = str(a.songTitle).localeCompare(str(b.songTitle), 'pl');
  }
  return cmp * dir;
}

function downloadIssuesCsv(rows: SpellcheckIssue[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = [
    'Pieśń',
    'Nr',
    'Śpiewnik',
    'Wers',
    'Słowo',
    'Propozycje',
    'Komunikat',
    'Reguła',
    'ID pieśni',
  ];
  const lines = rows.map((r) =>
    [
      r.songTitle,
      r.songNumber ?? '',
      songbookLabel(r.songbook),
      r.verseLabel || `Wers ${r.verseOrder + 1}`,
      r.word,
      r.suggestions.join('; '),
      r.message,
      r.ruleId,
      r.songId,
    ]
      .map(esc)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raport-literowek-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 2,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
} as const;

function SpellcheckReportContent() {
  usePageTitle('Raport literówek');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const canScan = isAuthenticated && !authLoading;

  const [scanSongbook, setScanSongbook] = useState<string>('');
  const [language, setLanguage] = useState('pl-PL');
  const [scanBatchSize, setScanBatchSize] =
    useState<(typeof SCAN_BATCH_SIZE_OPTIONS)[number]>(25);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterSongbook, setFilterSongbook] = useState('');
  const [filterRuleId, setFilterRuleId] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('songTitle');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof ROWS_PER_PAGE_OPTIONS)[number]>(25);

  const scanFilters = useMemo(
    () => ({
      songbook: scanSongbook || undefined,
      language,
      batchSize: scanBatchSize,
    }),
    [scanSongbook, language, scanBatchSize],
  );

  const scanSongbookLabel = scanSongbook
    ? songbookLabel(scanSongbook)
    : 'Wszystkie śpiewniki';
  const scanLanguageLabel = language === 'en-US' ? 'angielski' : 'polski';

  const {
    issues,
    lastMeta,
    isScanning,
    isAutoScanning,
    error,
    startScan,
    continueScan,
    scanAll,
    reset,
    hasMore,
    totalScanned,
  } = useSpellcheckReport();

  const progressPercent =
    lastMeta && lastMeta.totalSongs > 0
      ? Math.min(100, Math.round((totalScanned / lastMeta.totalSongs) * 100))
      : 0;

  const ruleOptions = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => {
      if (i.ruleId) set.add(i.ruleId);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return issues.filter((row) => {
      if (filterSongbook && row.songbook !== filterSongbook) return false;
      if (filterRuleId && row.ruleId !== filterRuleId) return false;
      if (q && !issueSearchHaystack(row).includes(q)) return false;
      return true;
    });
  }, [issues, debouncedSearch, filterSongbook, filterRuleId]);

  const sortedIssues = useMemo(
    () =>
      [...filteredIssues].sort((a, b) => compareIssues(a, b, sortBy, sortOrder)),
    [filteredIssues, sortBy, sortOrder],
  );

  const pageCount = Math.max(1, Math.ceil(sortedIssues.length / rowsPerPage));
  const safePage = Math.min(page, Math.max(0, pageCount - 1));

  useEffect(() => {
    const maxPage = Math.max(0, pageCount - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, pageCount]);

  const pagedIssues = useMemo(() => {
    const start = safePage * rowsPerPage;
    return sortedIssues.slice(start, start + rowsPerPage);
  }, [sortedIssues, safePage, rowsPerPage]);

  const uniqueSongsInView = useMemo(() => {
    return new Set(filteredIssues.map((i) => i.songId)).size;
  }, [filteredIssues]);

  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(filterSongbook) || Boolean(filterRuleId);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const clearResultFilters = () => {
    setSearch('');
    setFilterSongbook('');
    setFilterRuleId('');
    setPage(0);
  };

  const handleRowsPerPageChange = (next: number) => {
    setRowsPerPage(next as (typeof ROWS_PER_PAGE_OPTIONS)[number]);
    setPage(0);
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <SpellcheckIcon color="primary" />
        <Typography
          variant="h4"
          component="h1"
          fontWeight={600}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          Raport literówek w tekście pieśni
        </Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 820, lineHeight: 1.55 }}>
        Skan przez własny LanguageTool w Dockerze. Po zebraniu wyników użyj wyszukiwania, filtrów i
        sortowania — przy dużej liczbie pieśni wygodny jest eksport CSV i skan do końca.
      </Typography>

      {authLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Sprawdzanie sesji…
        </Alert>
      )}

      {!authLoading && !isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Aby uruchomić skan, zaloguj się przez Discord (wystarczy zwykłe konto zborowe).
          </Typography>
          <Button
            variant="contained"
            size="small"
            href={`${getApiUrlForOAuth()}/auth/discord`}
          >
            Zaloguj przez Discord
          </Button>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Skanowanie nie powiodło się.'}
          {error instanceof Error &&
            /401|Unauthorized|Invalid token/i.test(error.message) &&
            ' Zaloguj się ponownie i spróbuj jeszcze raz.'}
        </Alert>
      )}

      <Paper variant="outlined" sx={sectionPaperSx}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Ustawienia skanu (przed startem)
        </Typography>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', lg: 'flex-end' }}
          flexWrap="wrap"
          useFlexGap
        >
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel id="spellcheck-scan-songbook">Śpiewnik</InputLabel>
            <Select
              labelId="spellcheck-scan-songbook"
              label="Śpiewnik"
              value={scanSongbook}
              onChange={(e) => setScanSongbook(e.target.value)}
              disabled={isScanning}
            >
              <MenuItem value="">Wszystkie śpiewniki</MenuItem>
              {SONGBOOK_OPTIONS.map((opt) => (
                <MenuItem key={opt.slug} value={opt.slug}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <InputLabel id="spellcheck-lang">Język sprawdzania</InputLabel>
            <Select
              labelId="spellcheck-lang"
              label="Język sprawdzania"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isScanning}
            >
              <MenuItem value="pl-PL">polski</MenuItem>
              <MenuItem value="en-US">angielski</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <InputLabel id="spellcheck-batch">Pieśni na partię</InputLabel>
            <Select
              labelId="spellcheck-batch"
              label="Pieśni na partię"
              value={scanBatchSize}
              onChange={(e) =>
                setScanBatchSize(e.target.value as (typeof SCAN_BATCH_SIZE_OPTIONS)[number])
              }
              disabled={isScanning}
            >
              {SCAN_BATCH_SIZE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <InputLabel id="spellcheck-rows-pref">Wierszy w tabeli</InputLabel>
            <Select
              labelId="spellcheck-rows-pref"
              label="Wierszy w tabeli"
              value={rowsPerPage}
              onChange={(e) =>
                handleRowsPerPageChange(parseInt(e.target.value as string, 10))
              }
              disabled={isScanning}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={
                isScanning && !isAutoScanning ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <PlayArrowIcon />
                )
              }
              disabled={isScanning || !canScan}
              onClick={() => startScan(scanFilters)}
            >
              {isScanning && !isAutoScanning ? 'Skanowanie…' : 'Partia'}
            </Button>
            {hasMore && !isAutoScanning && (
              <Button
                variant="outlined"
                startIcon={<SkipNextIcon />}
                disabled={isScanning || !canScan}
                onClick={() => continueScan(scanFilters)}
              >
                Kolejna partia
              </Button>
            )}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={
                isAutoScanning ? <CircularProgress size={18} color="inherit" /> : <FastForwardIcon />
              }
              disabled={isScanning || !canScan}
              onClick={() => scanAll(scanFilters)}
            >
              {isAutoScanning ? 'Skan do końca…' : 'Skan do końca'}
            </Button>
            {(issues.length > 0 || lastMeta) && (
              <Button
                variant="text"
                startIcon={<RefreshIcon />}
                disabled={isScanning}
                onClick={() => {
                  reset();
                  clearResultFilters();
                }}
              >
                Wyczyść
              </Button>
            )}
          </Stack>
        </Stack>

        <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0.5 }}>
          <Typography variant="body2">
            Do sprawdzenia: <strong>{scanSongbookLabel}</strong> · język{' '}
            <strong>{scanLanguageLabel}</strong> · partia do <strong>{scanBatchSize}</strong> pieśni
            {isAutoScanning ? ' · tryb „do końca” przechodzi całą bazę' : ''}.
          </Typography>
        </Alert>

        {isScanning && !lastMeta && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress sx={{ mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Skan w toku…
            </Typography>
          </Box>
        )}

        {isScanning && lastMeta && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progressPercent} sx={{ mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Przeskanowano {totalScanned} / {lastMeta.totalSongs} pieśni ({progressPercent}%)
            </Typography>
          </Box>
        )}

        {lastMeta && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            <Chip label={`Trafień: ${issues.length}`} size="small" color="primary" variant="outlined" />
            <Chip
              label={`Po filtrach: ${filteredIssues.length}`}
              size="small"
              variant="outlined"
            />
            <Chip label={`Pieśni (filtrowane): ${uniqueSongsInView}`} size="small" variant="outlined" />
            <Chip
              label={`Przeskanowano: ${totalScanned}/${lastMeta.totalSongs}`}
              size="small"
              variant="outlined"
            />
            <Chip label="LanguageTool (Docker)" size="small" variant="outlined" />
          </Stack>
        )}
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: TABLE_BODY_MIN_HEIGHT + 200,
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Filtry wyników
          </Typography>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', lg: 'flex-end' }}
          >
            <TextField
              size="small"
              label="Szukaj w wynikach"
              placeholder="tytuł, słowo, propozycja, komunikat…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              disabled={issues.length === 0}
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Wyczyść wyszukiwanie"
                      onClick={() => {
                        setSearch('');
                        setPage(0);
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }} disabled={issues.length === 0}>
              <InputLabel id="spellcheck-filter-songbook">Śpiewnik (wyniki)</InputLabel>
              <Select
                labelId="spellcheck-filter-songbook"
                label="Śpiewnik (wyniki)"
                value={filterSongbook}
                onChange={(e) => {
                  setFilterSongbook(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Wszystkie</MenuItem>
                {SONGBOOK_OPTIONS.map((opt) => (
                  <MenuItem key={opt.slug} value={opt.slug}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={issues.length === 0}>
              <InputLabel id="spellcheck-filter-rule">Reguła LT</InputLabel>
              <Select
                labelId="spellcheck-filter-rule"
                label="Reguła LT"
                value={filterRuleId}
                onChange={(e) => {
                  setFilterRuleId(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Wszystkie</MenuItem>
                {ruleOptions.map((rule) => (
                  <MenuItem key={rule} value={rule}>
                    {rule}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              {hasActiveFilters && (
                <Button size="small" onClick={clearResultFilters} startIcon={<ClearIcon />}>
                  Filtry
                </Button>
              )}
              <Tooltip title="Eksportuje przefiltrowane i posortowane wiersze">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    disabled={filteredIssues.length === 0}
                    onClick={() => downloadIssuesCsv(sortedIssues)}
                  >
                    CSV
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{
            px: 2,
            py: 1,
            minHeight: 48,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {sortedIssues.length > 0 ? (
              <>
                Strona {safePage + 1} z {pageCount} · wiersze {safePage * rowsPerPage + 1}–
                {Math.min((safePage + 1) * rowsPerPage, sortedIssues.length)} z {sortedIssues.length}
              </>
            ) : (
              'Wyniki pojawią się w tabeli poniżej'
            )}
          </Typography>
          {pageCount > 1 && (
            <Pagination
              count={pageCount}
              page={safePage + 1}
              onChange={(_, p) => setPage(p - 1)}
              color="primary"
              size="small"
              siblingCount={1}
              boundaryCount={1}
              showFirstButton
              showLastButton
            />
          )}
        </Stack>
        <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === 'songTitle' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'songTitle'}
                  direction={sortBy === 'songTitle' ? sortOrder : 'asc'}
                  onClick={() => handleSort('songTitle')}
                >
                  Pieśń
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'songbook' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'songbook'}
                  direction={sortBy === 'songbook' ? sortOrder : 'asc'}
                  onClick={() => handleSort('songbook')}
                >
                  Śpiewnik
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'verse' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'verse'}
                  direction={sortBy === 'verse' ? sortOrder : 'asc'}
                  onClick={() => handleSort('verse')}
                >
                  Wers
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'word' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'word'}
                  direction={sortBy === 'word' ? sortOrder : 'asc'}
                  onClick={() => handleSort('word')}
                >
                  Słowo
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'suggestions' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'suggestions'}
                  direction={sortBy === 'suggestions' ? sortOrder : 'asc'}
                  onClick={() => handleSort('suggestions')}
                >
                  Propozycje
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'message' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'message'}
                  direction={sortBy === 'message' ? sortOrder : 'asc'}
                  onClick={() => handleSort('message')}
                >
                  Komunikat
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.length === 0 && !isScanning && (
              <TableRow>
                <TableCell colSpan={6} sx={{ minHeight: TABLE_BODY_MIN_HEIGHT, borderBottom: 0 }}>
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: TABLE_BODY_MIN_HEIGHT - 24 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Ustaw śpiewnik, język i wielkość partii powyżej, potem kliknij{' '}
                      <strong>Skan do końca</strong> lub <strong>Partia</strong>.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {issues.length > 0 && filteredIssues.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ minHeight: TABLE_BODY_MIN_HEIGHT, borderBottom: 0 }}>
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: TABLE_BODY_MIN_HEIGHT - 24 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Brak wyników dla podanych filtrów. Zmień wyszukiwanie lub wyczyść filtry.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {pagedIssues.map((row, index) => (
              <TableRow key={`${row.songId}-${row.verseOrder}-${row.offsetInVerse}-${index}`} hover>
                <TableCell sx={{ minWidth: 160 }}>
                  <Link component={RouterLink} to={`/songs/${row.songId}`} underline="hover" fontWeight={600}>
                    {row.songTitle}
                  </Link>
                  {row.songNumber && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      nr {row.songNumber}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={songbookLabel(row.songbook)} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {row.verseLabel || `Wers ${row.verseOrder + 1}`}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', maxWidth: 140 }}>{row.word}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  {(Array.isArray(row.suggestions) ? row.suggestions : []).join(', ')}
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" title={row.ruleId}>
                    {row.message}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {isScanning && issues.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ minHeight: TABLE_BODY_MIN_HEIGHT, borderBottom: 0 }}>
                  <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: TABLE_BODY_MIN_HEIGHT - 24 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary">
                      Skanowanie pieśni…
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedIssues.length}
          page={safePage}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) =>
            handleRowsPerPageChange(parseInt(e.target.value, 10))
          }
          rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
          labelRowsPerPage="Wierszy na stronę:"
          labelDisplayedRows={({ from, to, count }) =>
            count === 0 ? '0 wyników' : `${from}–${to} z ${count}`
          }
          sx={{
            mt: 'auto',
            borderTop: '1px solid',
            borderColor: 'divider',
            '.MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1 },
          }}
        />
      </Paper>
    </Box>
  );
}

export default function SpellcheckReportPage() {
  return <SpellcheckReportContent />;
}