import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
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
} from '@mui/icons-material';
import ProtectedRoute from '../components/ProtectedRoute';
import { usePresentationEvents, usePresentationStats } from '../hooks/usePresentationStats';
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
  if (!y || !m || !d) {
    return isoDate;
  }
  return `${d}.${m}.${y}`;
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
        <Box
          sx={{
            color: (theme: Theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'),
            display: 'flex',
            mt: 0.25,
          }}
        >
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
  usePageTitle('Statystyki OpenLP');
  const [clientId, setClientId] = useState('');
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const limit = 20;

  const summaryQuery = usePresentationStats(clientId || undefined, days);
  const eventsQuery = usePresentationEvents(page, limit, clientId || undefined);

  const summary = summaryQuery.data;
  const maxDayCount = useMemo(() => {
    const counts = summary?.byDay?.map(row => row.count) ?? [];
    return Math.max(...counts, 1);
  }, [summary?.byDay]);

  const uniqueSongs = summary?.bySong?.length ?? 0;
  const activeDays = summary?.byDay?.length ?? 0;

  if (summaryQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: 'auto' }}>
        <Alert severity="error">
          Nie udało się pobrać statystyk prezentacji. Wymagane uprawnienia edycji.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
        flex: 1,
      }}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <InsightsIcon
            sx={{
              fontSize: 36,
              color: (theme: Theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'),
            }}
          />
          <Typography variant="h4" component="h1" fontWeight={600} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Statystyki prezentacji (OpenLP)
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.55, maxWidth: 640 }}>
          Zdarzenia wysyłane z wtyczki Song Stats, gdy pieśń idzie na żywo podczas prezentacji w OpenLP.
        </Typography>

        <Paper elevation={0} sx={sectionPaperSx}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          >
            <TextField
              label="Client ID (opcjonalnie)"
              size="small"
              value={clientId}
              onChange={e => {
                setClientId(e.target.value);
                setPage(1);
              }}
              placeholder="np. identyfikator kościoła z OpenLP"
              fullWidth
              helperText="Zostaw puste, aby zobaczyć wszystkie instalacje"
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <InputLabel id="stats-days-label">Okres</InputLabel>
              <Select
                labelId="stats-days-label"
                label="Okres"
                value={days}
                onChange={e => setDays(Number(e.target.value))}
              >
                <MenuItem value={7}>7 dni</MenuItem>
                <MenuItem value={30}>30 dni</MenuItem>
                <MenuItem value={90}>90 dni</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <StatMetric
            label="Łącznie zdarzeń"
            value={summary?.totalEvents ?? 0}
            icon={<SlideshowIcon />}
          />
          <StatMetric label="Różnych pieśni" value={uniqueSongs} icon={<MusicNoteIcon />} />
          <StatMetric label="Dni z aktywnością" value={activeDays} icon={<HistoryIcon />} />
        </Stack>

        <Paper elevation={0} sx={sectionPaperSx}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Aktywność wg dni ({days} dni)
          </Typography>
          {summary?.byDay?.length ? (
            <Box sx={{ mt: 2 }}>
              {summary.byDay.map(row => (
                <Box
                  key={row.date}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: { xs: 72, sm: 88 }, flexShrink: 0, fontSize: '0.8rem' }}
                  >
                    {formatDayLabel(row.date)}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      height: 10,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${(row.count / maxDayCount) * 100}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                        minWidth: row.count > 0 ? 4 : 0,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ width: 32, textAlign: 'right', flexShrink: 0 }}
                  >
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
          Najczęściej prezentowane pieśni
        </Typography>
        <TableContainer component={Paper} elevation={0} sx={{ ...sectionPaperSx, p: 0, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Tytuł</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: 88 }}>
                  Liczba
                </TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Ostatnio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(summary?.bySong ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Brak danych o prezentacjach.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (summary?.bySong ?? []).map(row => (
                  <TableRow key={`${row.title}-${row.mongoSongId ?? 'x'}`} hover>
                    <TableCell>
                      {row.mongoSongId ? (
                        <Link
                          component={RouterLink}
                          to={`/songs/${row.mongoSongId}`}
                          underline="hover"
                          color="text.primary"
                          fontWeight={500}
                        >
                          {row.title}
                        </Link>
                      ) : (
                        row.title
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography component="span" fontWeight={600}>
                        {row.count}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.85rem' }}>
                      {row.lastPresentedAt ? formatDateTime(row.lastPresentedAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h6" fontWeight={600} sx={{ mt: 3, mb: 1.5 }}>
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
                    <TableCell sx={{ fontWeight: 600 }}>Tytuł</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      OpenLP ID
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(eventsQuery.data?.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
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
                          {row.mongoSongId ? (
                            <Link
                              component={RouterLink}
                              to={`/songs/${row.mongoSongId}`}
                              underline="hover"
                              color="text.primary"
                            >
                              {row.title}
                            </Link>
                          ) : (
                            row.title
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {row.clientId || '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {row.openlpSongId ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {(eventsQuery.data?.meta.totalPages ?? 0) > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={eventsQuery.data?.meta.totalPages ?? 1}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  size="small"
                />
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