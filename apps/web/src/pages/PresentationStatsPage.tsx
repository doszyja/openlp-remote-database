import { useEffect, useMemo, useState, type ReactNode, type MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Paper,
  Popover,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
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
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import {
  isMongoObjectId,
  type SongViewEvent,
  type SongViewGroupBy,
  type SongViewSource,
} from '@openlp/shared';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  useSongViewEvents,
  useSongViewSummary,
  type SongViewEventsSortBy,
} from '../hooks/usePresentationStats';
import { usePageTitle } from '../hooks/usePageTitle';
import { discordAvatarUrl } from '../utils/discordAvatar';

const STATS_SECTION_STORAGE = {
  activityByDay: 'openlp.stats.section.activityByDay',
  topSongs: 'openlp.stats.section.topSongs',
} as const;

const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 3,
  borderRadius: 2,
  border: '1px solid',
  borderColor: (theme: Theme) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
  bgcolor: 'background.paper',
} as const;

function readLocalBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // private mode / blocked storage
  }
  return fallback;
}

function writeLocalBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore quota / private mode
  }
}

function CollapsibleStatsSection({
  sectionId,
  title,
  storageKey,
  defaultExpanded = true,
  disableDetailsPadding = false,
  children,
}: {
  sectionId: string;
  title: string;
  storageKey: string;
  defaultExpanded?: boolean;
  disableDetailsPadding?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(() => readLocalBoolean(storageKey, defaultExpanded));

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => {
        setExpanded(next);
        writeLocalBoolean(storageKey, next);
      }}
      disableGutters
      elevation={0}
      sx={{
        ...sectionPaperSx,
        p: 0,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '&.Mui-expanded': { mt: 0, mb: 3 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`stats-section-${sectionId}-content`}
        id={`stats-section-${sectionId}-header`}
        sx={{
          px: { xs: 2, sm: 2.5 },
          minHeight: 56,
          '& .MuiAccordionSummary-content': { my: 1.25, overflow: 'hidden' },
        }}
      >
        <Typography variant="h6" fontWeight={600} component="h2" noWrap>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        id={`stats-section-${sectionId}-content`}
        sx={
          disableDetailsPadding
            ? { p: 0 }
            : { px: { xs: 2, sm: 2.5 }, pt: 0, pb: { xs: 2, sm: 2.5 } }
        }
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

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

function SourceChip({ source }: { source?: SongViewSource }) {
  const known = source === 'browser' || source === 'openlp';
  return (
    <Chip
      label={sourceLabel(source)}
      size="small"
      variant={known ? 'filled' : 'outlined'}
      sx={theme => {
        if (source === 'browser') {
          const color = theme.palette.mode === 'dark' ? '#A5D6A7' : '#1B5E20';
          return {
            fontWeight: 600,
            color,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(165, 214, 167, 0.16)' : 'rgba(27, 94, 32, 0.1)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(165, 214, 167, 0.45)' : 'rgba(27, 94, 32, 0.28)',
          };
        }
        if (source === 'openlp') {
          const color = theme.palette.mode === 'dark' ? '#90CAF9' : '#0D47A1';
          return {
            fontWeight: 600,
            color,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(13, 71, 161, 0.1)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.45)' : 'rgba(13, 71, 161, 0.28)',
          };
        }
        return { fontWeight: 600 };
      }}
    />
  );
}

function groupByLabel(groupBy: SongViewGroupBy | '') {
  if (groupBy === 'user') return 'użytkownik';
  if (groupBy === 'song') return 'pieśń';
  if (groupBy === 'day') return 'dzień';
  if (groupBy === 'source') return 'źródło';
  if (groupBy === 'device') return 'urządzenie';
  return '';
}

function discordProfileUrl(id?: string): string | undefined {
  if (!id || isMongoObjectId(id) || !/^\d{17,20}$/.test(id)) return undefined;
  return `https://discord.com/users/${id}`;
}

function ViewerIdentityCell({ row }: { row: SongViewEvent }) {
  const discordId =
    row.viewerDiscordId && !isMongoObjectId(row.viewerDiscordId)
      ? row.viewerDiscordId
      : row.clientId && !isMongoObjectId(row.clientId)
        ? row.clientId
        : undefined;
  const profileUrl = discordProfileUrl(discordId);
  const displayName =
    row.viewerUsername ||
    (row.sessionId ? `Sesja ${row.sessionId.slice(0, 8)}` : undefined) ||
    (row.clientId && isMongoObjectId(row.clientId)
      ? `Niepowiązane konto`
      : undefined) ||
    (discordId ? `Discord ${discordId}` : undefined);

  if (!displayName) {
    return (
      <Typography component="span" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        —
      </Typography>
    );
  }

  const sourceName = sourceLabel(row.source);
  const visibleName =
    profileUrl && !row.viewerUsername && sourceName !== '—'
      ? `${sourceName} · Discord ${discordId}`
      : sourceName !== '—'
        ? `${sourceName} · ${displayName}`
        : displayName;
  const hoverTitle = profileUrl ? `${sourceName !== '—' ? sourceName : 'OpenLP'} · Discord ${discordId}` : '';

  const body = (
    <Stack direction="row" spacing={1} alignItems="center" component="span">
      {discordId && (
        <Avatar
          src={discordAvatarUrl(discordId, row.viewerAvatar)}
          alt=""
          sx={{ width: 24, height: 24 }}
        />
      )}
      <Typography component="span" sx={{ fontSize: '0.85rem' }}>
        {visibleName}
      </Typography>
    </Stack>
  );

  if (!profileUrl) return body;

  return (
    <Tooltip title={hoverTitle}>
      <Link
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        color="inherit"
        sx={{
          cursor: 'pointer',
          '&:hover': { color: 'primary.main' },
        }}
      >
        {body}
      </Link>
    </Tooltip>
  );
}

type EventsSortField = SongViewEventsSortBy;

function EventsSortFilterHead({
  label,
  sortField,
  activeSortBy,
  sortOrder,
  onSort,
  filterActive,
  children,
}: {
  label: string;
  sortField: EventsSortField;
  activeSortBy: EventsSortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: EventsSortField) => void;
  filterActive?: boolean;
  children?: ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <TableCell sx={{ fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
      <Stack direction="row" alignItems="center" spacing={0} sx={{ minHeight: 32 }}>
        <TableSortLabel
          active={activeSortBy === sortField}
          direction={activeSortBy === sortField ? sortOrder : 'asc'}
          onClick={() => onSort(sortField)}
        >
          {label}
        </TableSortLabel>
        {children ? (
          <IconButton
            size="small"
            aria-label={`Filtr: ${label}`}
            color={filterActive ? 'primary' : 'default'}
            onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      {children ? (
        <Popover
          open={open}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 2, minWidth: 220 }}>
            {children}
            <Button size="small" onClick={() => setAnchor(null)} sx={{ mt: 1 }}>
              Zamknij
            </Button>
          </Box>
        </Popover>
      ) : null}
    </TableCell>
  );
}

function ListPagination({
  page,
  total,
  limit,
  onChange,
  noun,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  noun: string;
}) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <Stack alignItems="center" sx={{ py: 1.5 }}>
      {totalPages > 1 ? (
        <Pagination
          count={totalPages}
          page={Math.min(page, totalPages)}
          onChange={(_, value) => onChange(value)}
          color="primary"
          size="small"
          showFirstButton
          showLastButton
        />
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ mt: totalPages > 1 ? 1 : 0 }}>
        Wyświetlanie {from}-{to} z {total} {noun}
      </Typography>
    </Stack>
  );
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
  const [viewerUsernameFilter, setViewerUsernameFilter] = useState('');
  const [viewContextFilter, setViewContextFilter] = useState('');
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const [eventsSortBy, setEventsSortBy] = useState<EventsSortField>('presentedAt');
  const [eventsSortOrder, setEventsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [dayPage, setDayPage] = useState(1);
  const limit = 25;
  const groupLimit = 25;
  const dayPageSize = 31;

  const rankingScope = `${clientId}|${days}|${sourceFilter}|${deviceFilter}|${groupBy}`;
  const [rankingScopeSeen, setRankingScopeSeen] = useState(rankingScope);
  if (rankingScopeSeen !== rankingScope) {
    setRankingScopeSeen(rankingScope);
    setGroupPage(1);
  }

  const dayScope = `${clientId}|${days}|${sourceFilter}|${deviceFilter}`;
  const [dayScopeSeen, setDayScopeSeen] = useState(dayScope);
  if (dayScopeSeen !== dayScope) {
    setDayScopeSeen(dayScope);
    setDayPage(1);
  }

  const handleEventsSort = (field: EventsSortField) => {
    if (eventsSortBy === field) {
      setEventsSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEventsSortBy(field);
      setEventsSortOrder(field === 'presentedAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const summaryFilters = useMemo(
    () => ({
      clientId: clientId || undefined,
      days,
      source: sourceFilter || undefined,
      deviceType: deviceFilter || undefined,
      groupBy: groupBy || undefined,
      page: groupPage,
      limit: groupLimit,
    }),
    [clientId, days, sourceFilter, deviceFilter, groupBy, groupPage, groupLimit],
  );

  const listFilters = useMemo(
    () => ({
      clientId: clientId || undefined,
      source: sourceFilter || undefined,
      deviceType: deviceFilter || undefined,
      authenticated: authFilter || undefined,
      title: titleFilter || undefined,
      viewerUsername: viewerUsernameFilter || undefined,
      viewContext: viewContextFilter || undefined,
      timezone: timezoneFilter || undefined,
      sortBy: eventsSortBy,
      sortOrder: eventsSortOrder,
    }),
    [
      clientId,
      sourceFilter,
      deviceFilter,
      authFilter,
      titleFilter,
      viewerUsernameFilter,
      viewContextFilter,
      timezoneFilter,
      eventsSortBy,
      eventsSortOrder,
    ],
  );

  const summaryQuery = useSongViewSummary(summaryFilters);
  const eventsQuery = useSongViewEvents(page, limit, listFilters);

  const summary = summaryQuery.data;
  const maxDayCount = useMemo(() => {
    const counts = summary?.byDay?.map(row => row.count) ?? [];
    return Math.max(...counts, 1);
  }, [summary?.byDay]);

  useEffect(() => {
    const totalPages = summary?.groupedMeta?.totalPages;
    if (totalPages && groupPage > totalPages) setGroupPage(totalPages);
  }, [summary?.groupedMeta?.totalPages, groupPage]);

  useEffect(() => {
    const totalPages = eventsQuery.data?.meta.totalPages;
    if (totalPages && page > totalPages) setPage(totalPages);
  }, [eventsQuery.data?.meta.totalPages, page]);

  const dayRows = summary?.byDay ?? [];
  const visibleDays = dayRows.slice((dayPage - 1) * dayPageSize, dayPage * dayPageSize);

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

  const groupedRows =
    summary?.grouped ??
    summary?.bySong?.map(row => ({
      key: row.mongoSongId || row.title,
      label: row.title,
      count: row.count,
    })) ??
    [];

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
                label="ID użytkownika (clientId OpenLP)"
                size="small"
                value={clientId}
                onChange={e => {
                  setClientId(e.target.value);
                  setPage(1);
                }}
                placeholder="id z GET /api/auth/me"
                helperText="Plugin wysyła to samo id co pole user.id po zalogowaniu (MongoDB)"
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
                  sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
                  onChange={e => {
                    setSourceFilter(e.target.value as '' | SongViewSource);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Wszystkie</MenuItem>
                  <MenuItem value="browser">
                    <SourceChip source="browser" />
                  </MenuItem>
                  <MenuItem value="openlp">
                    <SourceChip source="openlp" />
                  </MenuItem>
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
                  <MenuItem value="user">Użytkownik</MenuItem>
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

        <CollapsibleStatsSection
          sectionId="activity-by-day"
          title={`Aktywność wg dni (${days} dni)`}
          storageKey={STATS_SECTION_STORAGE.activityByDay}
        >
          {visibleDays.length ? (
            <Box>
              {visibleDays.map(row => (
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
            <Typography variant="body2" color="text.secondary">
              Brak zdarzeń w wybranym okresie.
            </Typography>
          )}
          <ListPagination
            page={dayPage}
            total={dayRows.length}
            limit={dayPageSize}
            onChange={setDayPage}
            noun="dni"
          />
        </CollapsibleStatsSection>

        <CollapsibleStatsSection
          sectionId="top-songs"
          title={groupBy ? `Grupowanie: ${groupByLabel(groupBy)}` : 'Najczęściej oglądane pieśni'}
          storageKey={STATS_SECTION_STORAGE.topSongs}
          disableDetailsPadding
        >
          <TableContainer sx={{ overflow: 'auto' }}>
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
                      <TableCell>
                        {groupBy === 'source' ? (
                          <SourceChip source={row.key === 'browser' || row.key === 'openlp' ? row.key : undefined} />
                        ) : discordProfileUrl(row.key) ? (
                          <Tooltip title={`OpenLP · Discord ${row.key}`}>
                            <Link
                              href={discordProfileUrl(row.key)}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              color="inherit"
                              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                            >
                              {row.label.startsWith('Discord ') || row.label === row.key
                                ? `OpenLP · Discord ${row.key}`
                                : row.label}
                            </Link>
                          </Tooltip>
                        ) : (
                          row.label
                        )}
                      </TableCell>
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
          <ListPagination
            page={groupPage}
            total={summary?.groupedMeta?.total ?? groupedRows.length}
            limit={summary?.groupedMeta?.limit ?? groupLimit}
            onChange={setGroupPage}
            noun="pozycji"
          />
        </CollapsibleStatsSection>

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
                    <EventsSortFilterHead
                      label="Czas"
                      sortField="presentedAt"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                    />
                    <EventsSortFilterHead
                      label="Źródło"
                      sortField="source"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(sourceFilter)}
                    >
                      <FormControl size="small" fullWidth>
                        <InputLabel id="hdr-source-label">Źródło</InputLabel>
                        <Select
                          labelId="hdr-source-label"
                          label="Źródło"
                          value={sourceFilter}
                          sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
                          onChange={e => {
                            setSourceFilter(e.target.value as '' | SongViewSource);
                            setPage(1);
                          }}
                        >
                          <MenuItem value="">Wszystkie</MenuItem>
                          <MenuItem value="browser">
                            <SourceChip source="browser" />
                          </MenuItem>
                          <MenuItem value="openlp">
                            <SourceChip source="openlp" />
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </EventsSortFilterHead>
                    <EventsSortFilterHead
                      label="Tytuł"
                      sortField="title"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(titleFilter)}
                    >
                      <TextField
                        size="small"
                        label="Zawiera tekst"
                        fullWidth
                        value={titleFilter}
                        onChange={e => {
                          setTitleFilter(e.target.value);
                          setPage(1);
                        }}
                      />
                    </EventsSortFilterHead>
                    <EventsSortFilterHead
                      label="Użytkownik / sesja"
                      sortField="viewerUsername"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(viewerUsernameFilter) || Boolean(authFilter)}
                    >
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          label="Nick (zawiera)"
                          fullWidth
                          value={viewerUsernameFilter}
                          onChange={e => {
                            setViewerUsernameFilter(e.target.value);
                            setPage(1);
                          }}
                        />
                        <FormControl size="small" fullWidth>
                          <InputLabel id="hdr-auth-label">Sesja</InputLabel>
                          <Select
                            labelId="hdr-auth-label"
                            label="Sesja"
                            value={authFilter}
                            onChange={e => {
                              setAuthFilter(e.target.value as '' | 'true' | 'false');
                              setPage(1);
                            }}
                          >
                            <MenuItem value="">Wszyscy</MenuItem>
                            <MenuItem value="true">Zalogowani</MenuItem>
                            <MenuItem value="false">Anonimowi (sesja)</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </EventsSortFilterHead>
                    <EventsSortFilterHead
                      label="Urządzenie"
                      sortField="deviceType"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(deviceFilter)}
                    >
                      <FormControl size="small" fullWidth>
                        <InputLabel id="hdr-device-label">Urządzenie</InputLabel>
                        <Select
                          labelId="hdr-device-label"
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
                    </EventsSortFilterHead>
                    <EventsSortFilterHead
                      label="Kontekst"
                      sortField="viewContext"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(viewContextFilter)}
                    >
                      <FormControl size="small" fullWidth>
                        <InputLabel id="hdr-ctx-label">Kontekst</InputLabel>
                        <Select
                          labelId="hdr-ctx-label"
                          label="Kontekst"
                          value={viewContextFilter}
                          onChange={e => {
                            setViewContextFilter(e.target.value);
                            setPage(1);
                          }}
                        >
                          <MenuItem value="">Wszystkie</MenuItem>
                          <MenuItem value="detail">detail</MenuItem>
                          <MenuItem value="presentation">presentation</MenuItem>
                          <MenuItem value="live">live</MenuItem>
                          <MenuItem value="list">list</MenuItem>
                        </Select>
                      </FormControl>
                    </EventsSortFilterHead>
                    <EventsSortFilterHead
                      label="Strefa"
                      sortField="timezone"
                      activeSortBy={eventsSortBy}
                      sortOrder={eventsSortOrder}
                      onSort={handleEventsSort}
                      filterActive={Boolean(timezoneFilter)}
                    >
                      <TextField
                        size="small"
                        label="Strefa (zawiera)"
                        fullWidth
                        placeholder="Europe/Warsaw"
                        value={timezoneFilter}
                        onChange={e => {
                          setTimezoneFilter(e.target.value);
                          setPage(1);
                        }}
                      />
                    </EventsSortFilterHead>
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
                          <SourceChip source={row.source} />
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
                        <TableCell>
                          <ViewerIdentityCell row={row} />
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
            <ListPagination
              page={page}
              total={eventsQuery.data?.meta.total ?? 0}
              limit={eventsQuery.data?.meta.limit ?? limit}
              onChange={setPage}
              noun="zdarzeń"
            />
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