import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
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
  TableRow,
  TextField,
  Typography,
  type Theme,
} from '@mui/material';
import {
  Insights as InsightsIcon,
  MusicNote as MusicNoteIcon,
  History as HistoryIcon,
  Slideshow as SlideshowIcon,
  Groups as GroupsIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import type { SongViewGroupBy, SongViewSource } from '@openlp/shared';
import ProtectedRoute from '../components/ProtectedRoute';
import { useSongViewEvents, useSongViewSummary } from '../hooks/usePresentationStats';
import { usePageTitle } from '../hooks/usePageTitle';

const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 3,
  borderRadius: 2,
  border: '1px solid',
  borderColor: (theme: Theme) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
  bgcolor: 'background.paper',
} as const;

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

function sourceLabel(source?: SongViewSource) {
  if (source === 'browser') return 'Przeglądarka';
  if (source === 'openlp') return 'OpenLP';
  return '—';
}

function StatMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ color: (theme: Theme) => (theme.palette.mode === 'dark' ? '#FFF' : '#000'), display: 'flex', mt: 0.25 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" component="p" fontWeight={600}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function PresentationStatsContent() {
  usePageTitle('Statystyki odsłon');
  const [clientId, setClientId] = useState('');
  const [days, setDays] = useState(30);
  const [sourceFilter, setSourceFilter] = useState<'' | SongViewSource>('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [groupBy, setGroupBy] = useState<SongViewGroupBy | ''>('');
  const [authFilter, setAuthFilter] = useState<'' | 'true' | 'false'>('');
  const [titleFilter, setTitleFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const summaryFilters = useMemo(
    () => ({
      clientId: clientId || undefined,
      days,
      source: sourceFilter || undefined,
      deviceType: deviceFilter || undefined,
      groupBy: groupBy || undefined,
    }),
    [clientId, days, sourceFilter, deviceFilter, groupBy],
  );

  const listFilters = useMemo(
    () => ({
      clientId: clientId || undefined,
      source: sourceFilter || undefined,
      deviceType: deviceFilter || undefined,
      authenticated: authFilter || undefined,
      title: titleFilter || undefined,
    }),
    [clientId, sourceFilter, deviceFilter, authFilter, titleFilter],
  );

  const summaryQuery = useSongViewSummary(summaryFilters);
  const eventsQuery = useSongViewEvents(page, limit, listFilters);

  const summary = summaryQuery.data;
  const maxDayCount = useMemo(() => {
    const counts = summary?.byDay?.map(row => row.count) ?? [];
    return Math.max(...counts, 1);
  }, [summary?.byDay]);

  if (summaryQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
        <Alert severity="error">
          Nie udało się pobrać statystyk. Wymagane uprawnienia edycji.
        </Alert>
      </Box>
    );
  }

  const groupedRows = summary?.grouped?.length
    ? summary.grouped
    : summary?.bySong?.map(row => ({
        key: row.mongoSongId || row.title,
        label: row.title,
        count: row.count,
      }));

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 }, flex: 1 }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', width: '100%' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <InsightsIcon sx={{ fontSize: 36, color: (t: Theme) => (t.palette.mode === 'dark' ? '#FFF' : '#000') }} />
          <Typography variant="h4" component="h1" fontWeight={600} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Statystyki odsłon pieśni
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.55, maxWidth: 760 }}>
          Zbieramy odsłony z OpenLP (prezentacja na żywo) oraz z przeglądarki (widok pieśni, prezentacja, live).
          Bez dodatkowych uprawnień zapisujemy m.in. typ urządzenia, przeglądarkę, język i strefę czasową; przy logowaniu
          dopinamy konto użytkownika.
        </Typography>

        <Paper elevation={0} sx={sectionPaperSx}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
              <TextField
                label="Client ID (OpenLP)"
                size="small"
                value={clientId}
                onChange={e => {
                  setClientId(e.target.value);
                  setPage(1);
                }}
                placeholder="opcjonalnie"
                sx={{ flex: 1, minWidth: 200 }}
              />
              <TextField
                label="Filtr tytułu (tabela)"
                size="small"
                value={titleFilter}
                onChange={e => {
                  setTitleFilter(e.target.value);
                  setPage(1);
                }}
                sx={{ flex: 1, minWidth: 200 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="stats-days-label">Okres</InputLabel>
                <Select labelId="stats-days-label" label="Okres" value={days} onChange={e => setDays(Number(e.target.value))}>
                  <MenuItem value={7}>7 dni</MenuItem>
                  <MenuItem value={30}>30 dni</MenuItem>
                  <MenuItem value={90}>90 dni</MenuItem>
                  <MenuItem value={180}>180 dni</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="stats-source-label">Źródło</InputLabel>
                <Select
                  labelId="stats-source-label"
                  label="Źródło"
                  value={sourceFilter}
                  onChange={e => {
                    setSourceFilter(e.target.value as '' | SongViewSource);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Wszystkie</MenuItem>
                  <MenuItem value="browser">Przeglądarka</MenuItem>
                  <MenuItem value="openlp">OpenLP</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="stats-device-label">Urządzenie</InputLabel>
                <Select
                  labelId="stats-device-label"
                  label="Urządzenie"
                  value={deviceFilter}
                  onChange={e => {
                    setDeviceFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Wszystkie</MenuItem>
                  <MenuItem value="mobile">mobile</MenuItem>
                  <MenuItem value="tablet">tablet</MenuItem>
                  <MenuItem value="desktop">desktop</MenuItem>
                  <MenuItem value="unknown">unknown</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="stats-auth-label">Użytkownik</InputLabel>
                <Select
                  labelId="stats-auth-label"
                  label="Użytkownik"
                  value={authFilter}
                  onChange={e => {
                    setAuthFilter(e.target.value as '' | 'true' | 'false');
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Wszyscy</MenuItem>
                  <MenuItem value="true">Zalogowani</MenuItem>
                  <MenuItem value="false">Anonimowi</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="stats-group-label">Grupuj wg</InputLabel>
                <Select
                  labelId="stats-group-label"
                  label="Grupuj wg"
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as SongViewGroupBy | '')}
                >
                  <MenuItem value="">Top pieśni (domyślnie)</MenuItem>
                  <MenuItem value="song">Pieśń</MenuItem>
                  <MenuItem value="day">Dzień</MenuItem>
                  <MenuItem value="source">Źródło</MenuItem>
                  <MenuItem value="device">Urządzenie</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          <StatMetric label="Łącznie" value={summary?.totalEvents ?? 0} icon={<SlideshowIcon />} />
          <StatMetric label="Zalogowani" value={summary?.authenticatedViews ?? 0} icon={<GroupsIcon />} />
          <StatMetric label="Anonimowi" value={summary?.anonymousViews ?? 0} icon={<HistoryIcon />} />
          <StatMetric label="Źródeł OpenLP" value={summary?.bySource?.find(s => s.source === 'openlp')?.count ?? 0} icon={<MusicNoteIcon />} />
          <StatMetric label="Z przeglądarki" value={summary?.bySource?.find(s => s.source === 'browser')?.count ?? 0} icon={<DevicesIcon />} />
        </Stack>

        <Paper elevation={0} sx={sectionPaperSx}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Aktywność wg dni ({days} dni)
          </Typography>
          {summary?.byDay?.length ? (
            <Box sx={{ mt: 2 }}>
              {summary.byDay.map(row => (
                <Box key={row.date} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: { xs: 72, sm: 88 }, flexShrink: 0, fontSize: '0.8rem' }}>
                    {formatDayLabel(row.date)}
                  </Typography>
                  <Box sx={{ flex: 1, height: 10, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ width: `${(row.count / maxDayCount) * 100}%`, height: '100%', bgcolor: 'primary.main', minWidth: row.count > 0 ? 4 : 0 }} />
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ width: 32, textAlign: 'right' }}>
                    {row.count}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Brak zdarzeń w wybranym okresie.
            </Typography>
          )}
        </Paper>

        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          {groupBy ? `Grupowanie: ${groupBy}` : 'Najczęściej oglądane pieśni'}
        </Typography>
        <TableContainer component={Paper} elevation={0} sx={{ ...sectionPaperSx, p: 0, overflow: 'auto', mb: 3 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Etykieta</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: 88 }}>
                  Liczba
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(groupedRows ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Brak danych.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (groupedRows ?? []).map(row => (
                  <TableRow key={row.key} hover>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">
                      <Typography component="span" fontWeight={600}>
                        {row.count}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          Ostatnie zdarzenia
        </Typography>
        {eventsQuery.isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0} sx={{ ...sectionPaperSx, p: 0, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Czas</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Źródło</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tytuł</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Użytkownik / sesja</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Urządzenie</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Kontekst</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Strefa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(eventsQuery.data?.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          Brak zarejestrowanych zdarzeń.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    eventsQuery.data?.data.map(row => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'text.secondary' }}>
                          {formatDateTime(row.presentedAt)}
                        </TableCell>
                        <TableCell>
                          <Chip label={sourceLabel(row.source)} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {row.mongoSongId ? (
                            <Link component={RouterLink} to={`/songs/${row.mongoSongId}`} underline="hover">
                              {row.title}
                            </Link>
                          ) : (
                            row.title
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          {row.viewerUsername || row.sessionId?.slice(0, 8) || row.clientId || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {[row.deviceType, row.browserName, row.osName].filter(Boolean).join(' · ') || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{row.viewContext || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{row.timezone || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {(eventsQuery.data?.meta.totalPages ?? 0) > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={eventsQuery.data?.meta.totalPages ?? 1} page={page} onChange={(_, value) => setPage(value)} color="primary" size="small" />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export default function PresentationStatsPage() {
  return (
    <ProtectedRoute>
      <PresentationStatsContent />
    </ProtectedRoute>
  );
}