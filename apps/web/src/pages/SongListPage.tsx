import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  List as MuiList,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import type { SongbookSlug } from '@openlp/shared';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useAuth } from '../contexts/AuthContext';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import SongList from '../components/SongList';

// Session storage keys for remembering state
const SEARCH_STORAGE_KEY = 'songListSearch';
const SELECTED_SONG_STORAGE_KEY = 'songListSelectedSong';
const SONGBOOK_FILTER_STORAGE_KEY = 'songListSongbookFilter';

// Songbook filter options
const SONGBOOK_OPTIONS: { slug: SongbookSlug; label: string; color: string }[] = [
  { slug: 'pielgrzym', label: 'Pielgrzym', color: '#1976d2' },
  { slug: 'zielony', label: 'Zielony', color: '#388e3c' },
  { slug: 'wedrowiec', label: 'Wędrowiec', color: '#f57c00' },
  { slug: 'zborowe', label: 'Zborowe', color: '#7b1fa2' },
];

export default function SongListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const showBackButton = useMediaQuery(theme.breakpoints.down(900)); // Show list when search is hidden (below 900px)
  const { hasEditPermission, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Initialize search from sessionStorage (for remembering search when coming back)
  const [search, setSearch] = useState('');

  // Songbook filter state
  const [songbookFilter, setSongbookFilter] = useState<SongbookSlug | null>(null);

  // Track the last selected song ID for highlighting
  const [lastSelectedSongId, setLastSelectedSongId] = useState<string | null>(null);

  // Restore state from sessionStorage on mount (only on mobile)
  useEffect(() => {
    if (isMobile) {
      const savedSearch = sessionStorage.getItem(SEARCH_STORAGE_KEY);
      const savedSongId = sessionStorage.getItem(SELECTED_SONG_STORAGE_KEY);
      const savedSongbook = sessionStorage.getItem(
        SONGBOOK_FILTER_STORAGE_KEY
      ) as SongbookSlug | null;

      if (savedSearch) {
        setSearch(savedSearch);
      }
      if (savedSongId) {
        setLastSelectedSongId(savedSongId);
        // Clear the stored song ID after restoring (so it doesn't persist forever)
        // But keep it in state for highlighting
        sessionStorage.removeItem(SELECTED_SONG_STORAGE_KEY);
      }
      if (savedSongbook) {
        setSongbookFilter(savedSongbook);
      }
    }
  }, [isMobile]);

  // Clear the highlighting after a delay
  useEffect(() => {
    if (lastSelectedSongId) {
      const timer = setTimeout(() => {
        setLastSelectedSongId(null);
      }, 3000); // Clear highlighting after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [lastSelectedSongId]);

  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<number>(0);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const exportZip = useExportZip();

  // Auto-set sort order to 'desc' when filtering by 'zborowe'
  useEffect(() => {
    if (songbookFilter === 'zborowe') {
      setSortOrder('desc');
    } else if (songbookFilter && sortOrder === 'desc') {
      // Reset to 'asc' when switching to other filters (if currently on 'desc')
      setSortOrder('asc');
    }
  }, [songbookFilter]);
  const hasAutoNavigatedRef = useRef(false);

  // Use cached songs for both search and initial list (no API calls needed)
  const {
    songs: cachedSongs,
    isLoading: isCacheLoading,
    error,
    refetch: refetchCache,
  } = useCachedSongs();
  const { results: searchResults, isLoading: isSearchLoading } = useCachedSongSearch(search);

  // Use cached search results if we have a search query, otherwise use cached songs list
  const useCacheForSearch = !!search.trim();

  // Determine loading state
  const isLoading = useCacheForSearch ? isSearchLoading : isCacheLoading;

  // Get the songs to display - use search results if searching, otherwise use all cached songs
  // Also filter by songbook if a filter is selected
  const displaySongs = useMemo(() => {
    let songs = useCacheForSearch ? searchResults || [] : cachedSongs || [];

    // Apply songbook filter
    if (songbookFilter) {
      if (songbookFilter === 'zborowe') {
        // "zborowe" means songs that are NOT in any songbook ('pielgrzym', 'zielony', or 'wedrowiec')
        songs = songs.filter(
          song =>
            !song.songbook ||
            (song.songbook !== 'pielgrzym' &&
              song.songbook !== 'zielony' &&
              song.songbook !== 'wedrowiec')
        );
      } else {
        songs = songs.filter(song => song.songbook === songbookFilter);
      }
    }

    return songs;
  }, [useCacheForSearch, searchResults, cachedSongs, songbookFilter]);

  // Get first song ID for auto-selection (only when not searching and songs are loaded)
  const firstSongId = useMemo(() => {
    if (useCacheForSearch || !displaySongs || displaySongs.length === 0) {
      return undefined;
    }
    return displaySongs[0]?.id;
  }, [useCacheForSearch, displaySongs]);

  // Check if we should auto-navigate (before rendering to prevent visual jump)
  // Don't auto-navigate on mobile or when viewport < 900px (search is hidden) - show list instead
  const shouldAutoNavigate = useMemo(() => {
    return (
      !showBackButton && // Don't auto-navigate when viewport < 900px (search is hidden)
      location.pathname === '/songs' &&
      !hasAutoNavigatedRef.current &&
      !isLoading &&
      !useCacheForSearch &&
      !!firstSongId
    );
  }, [showBackButton, location.pathname, isLoading, useCacheForSearch, firstSongId]);

  // Auto-navigate to first song on initial load (only if we're on /songs exactly, not /songs/:id)
  // Use useLayoutEffect to navigate synchronously before browser paints, preventing visual jump
  useLayoutEffect(() => {
    if (!shouldAutoNavigate) return;

    hasAutoNavigatedRef.current = true;
    // Use replace: true to avoid adding to history and prevent visual jump
    navigate(`/songs/${firstSongId}`, { replace: true });
  }, [shouldAutoNavigate, firstSongId, navigate]);

  // Debounce loading animation - only show if request takes longer than 300ms
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingAnimation(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowLoadingAnimation(false);
    }
  }, [isLoading]);

  // Hide navbar when error state
  useEffect(() => {
    if (error) {
      document.body.classList.add('error-state');
      return () => {
        document.body.classList.remove('error-state');
      };
    } else {
      document.body.classList.remove('error-state');
    }
  }, [error]);

  const handleExportZip = useCallback(async () => {
    // Prevent multiple clicks - debounce of 3 seconds
    const now = Date.now();
    const timeSinceLastExport = now - lastExportTime;
    const DEBOUNCE_TIME = 3000; // 3 seconds

    if (isExporting || exportZip.isFetching || timeSinceLastExport < DEBOUNCE_TIME) {
      // Already exporting or too soon since last export
      return;
    }

    setIsExporting(true);
    setLastExportTime(now);

    try {
      // Use React Query to fetch (will use cache if available)
      const blob = await exportZip.refetch();

      if (blob.data) {
        const url = window.URL.createObjectURL(blob.data);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `openlp-songs-${timestamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccess('Eksport zakończony pomyślnie!');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Nie udało się wyeksportować pieśni. Spróbuj ponownie.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, exportZip, lastExportTime, showSuccess, showError]);

  // Show full-screen error if API fails
  if (error) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(26, 35, 50, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          zIndex: 9999,
          px: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            bgcolor: 'background.paper',
            boxShadow: theme =>
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: theme =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.12)'
                : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 2,
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 64,
              color: 'error.main',
              mb: 2,
              opacity: 0.8,
            }}
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{
              mb: 1,
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Nie udało się załadować pieśni
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              color: 'text.secondary',
            }}
          >
            Wystąpił problem z połączeniem. Sprawdź połączenie internetowe i spróbuj ponownie.
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchCache();
            }}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              mb: 2,
            }}
          >
            Spróbuj ponownie
          </Button>
          <Box sx={{ mt: 2 }}>
            <Link
              to="/"
              style={{
                fontSize: '0.875rem',
                color: 'inherit',
                textDecoration: 'none',
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.7';
              }}
            >
              Powrót do Strony Głównej
            </Link>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Don't render content if we're about to auto-navigate (prevents visual jump)
  if (shouldAutoNavigate) {
    return null;
  }

  return (
    <Box
      sx={{
        py: { xs: 1, sm: 2.5, md: 4 },
        px: { xs: 1, sm: 2.5, md: 4, lg: 6 },
        position: 'relative',
        maxWidth: { xs: '100%', sm: '100%', md: '100%' },
        width: '100%',
        boxSizing: 'border-box',
        // On mobile: use flex to fill available space automatically
        flex: { xs: 1, sm: 'none' },
        minHeight: { xs: 0, sm: 'auto' },
        overflow: { xs: 'hidden', sm: 'visible' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Skeleton loading for list items - only show after debounce delay */}
      {showLoadingAnimation && isLoading && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            boxShadow: theme =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: theme =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 2,
            overflow: 'hidden',
            animation: 'fadeIn 0.3s ease-in',
            '@keyframes fadeIn': {
              from: {
                opacity: 0,
              },
              to: {
                opacity: 1,
              },
            },
          }}
        >
          <MuiList dense sx={{ py: 1 }}>
            {[...Array(10)].map((_, index) => (
              <ListItem
                key={index}
                disablePadding
                sx={{
                  borderBottom: theme =>
                    index < 9
                      ? `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                      : 'none',
                }}
              >
                <ListItemButton disabled sx={{ py: 1.5, px: 2 }}>
                  <ListItemText
                    primary={
                      <Skeleton
                        variant="text"
                        width={index % 3 === 0 ? '70%' : index % 3 === 1 ? '55%' : '65%'}
                        height={22}
                        animation="wave"
                        sx={{
                          bgcolor: theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                          borderRadius: 0.5,
                        }}
                      />
                    }
                    secondary={
                      index % 3 === 0 ? (
                        <Skeleton
                          variant="text"
                          width="45%"
                          height={18}
                          animation="wave"
                          sx={{
                            mt: 0.5,
                            bgcolor: theme =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.04)',
                            borderRadius: 0.5,
                          }}
                        />
                      ) : null
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </MuiList>
        </Paper>
      )}

      {/* Normal content when not loading */}
      {!showLoadingAnimation && (
        <>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={{ xs: 1, sm: 2 }}
            flexWrap="wrap"
            gap={{ xs: 0.5, sm: 1 }}
            flexShrink={0}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isAuthenticated && (
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
                  }}
                >
                  Pieśni
                </Typography>
              )}
              {isMobile && isAuthenticated && (
                <Tooltip title={sortOrder === 'asc' ? 'Sortuj A→Z' : 'Sortuj Z→A'}>
                  <IconButton
                    onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    size="small"
                    sx={{
                      width: 24,
                      height: 24,
                      opacity: 0.6,
                      transition: 'opacity 0.2s ease',
                      '&:hover': {
                        opacity: 1,
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: '0.875rem',
                      },
                    }}
                    aria-label={sortOrder === 'asc' ? 'Sortuj rosnąco' : 'Sortuj malejąco'}
                  >
                    {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Box display="flex" gap={0.75} flexWrap="wrap">
              {hasEditPermission && (
                <Button
                  variant="outlined"
                  startIcon={
                    isExporting || exportZip.isFetching ? (
                      <CircularProgress size={14} />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={handleExportZip}
                  disabled={isExporting || exportZip.isFetching || !!error}
                  size="small"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.75 },
                    borderColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                    color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : undefined),
                    '&:hover': {
                      borderColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                    },
                  }}
                >
                  {isExporting || exportZip.isFetching ? 'Eksportowanie...' : 'Eksportuj'}
                </Button>
              )}
              {hasEditPermission && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/songs/new')}
                  disabled={!!error}
                  size="small"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.75 },
                  }}
                >
                  Dodaj Pieśń
                </Button>
              )}
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, sm: 2 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              // On mobile: flex to fill remaining space
              flex: { xs: 1, sm: 'none' },
              minHeight: { xs: 0, sm: 'auto' },
              display: { xs: 'flex', sm: 'block' },
              flexDirection: { xs: 'column', sm: 'row' },
              overflow: { xs: 'hidden', sm: 'visible' },
            }}
          >
            <SongList
              songs={displaySongs}
              onSongClick={songId => {
                // Save selected song ID on mobile for highlighting when coming back
                if (isMobile) {
                  sessionStorage.setItem(SELECTED_SONG_STORAGE_KEY, songId);
                }
                navigate(`/songs/${songId}`);
              }}
              currentSongId={isMobile && lastSelectedSongId ? lastSelectedSongId : firstSongId}
              showSearch={true}
              searchValue={search}
              onSearchChange={value => {
                setSearch(value);
                // Clear songbook filter when search is cleared
                if (!value) {
                  setSongbookFilter(null);
                }
                // Save search to sessionStorage on mobile
                if (isMobile) {
                  if (value) {
                    sessionStorage.setItem(SEARCH_STORAGE_KEY, value);
                  } else {
                    sessionStorage.removeItem(SEARCH_STORAGE_KEY);
                    sessionStorage.removeItem(SONGBOOK_FILTER_STORAGE_KEY);
                  }
                }
              }}
              isLoading={isLoading}
              emptyMessage={
                cachedSongs && cachedSongs.length === 0
                  ? 'Nie znaleziono pieśni. Utwórz pierwszą pieśń!'
                  : 'Nie znaleziono pieśni.'
              }
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              hasActiveFilter={!!songbookFilter}
              filterContent={
                <>
                  {SONGBOOK_OPTIONS.map(option => (
                    <Chip
                      key={option.slug}
                      label={option.label}
                      size="small"
                      onClick={() => {
                        // Toggle off if clicking the same filter
                        const newFilter = songbookFilter === option.slug ? null : option.slug;
                        setSongbookFilter(newFilter);
                        // Save to sessionStorage on mobile
                        if (isMobile) {
                          if (newFilter) {
                            sessionStorage.setItem(SONGBOOK_FILTER_STORAGE_KEY, newFilter);
                          } else {
                            sessionStorage.removeItem(SONGBOOK_FILTER_STORAGE_KEY);
                          }
                        }
                      }}
                      sx={{
                        fontWeight: songbookFilter === option.slug ? 600 : 400,
                        fontSize: { xs: '0.85rem', sm: '0.7rem' },
                        height: { xs: 32, sm: 24 },
                        flexShrink: 0,
                        backgroundColor:
                          songbookFilter === option.slug
                            ? option.color
                            : theme =>
                                theme.palette.mode === 'dark'
                                  ? 'transparent'
                                  : 'rgba(0, 0, 0, 0.06)',
                        color: songbookFilter === option.slug ? '#fff' : 'text.primary',
                        border: '1px solid',
                        borderColor:
                          songbookFilter === option.slug
                            ? `${option.color} !important`
                            : theme =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor:
                            songbookFilter === option.slug
                              ? option.color
                              : theme =>
                                  theme.palette.mode === 'dark'
                                    ? 'transparent'
                                    : 'rgba(0, 0, 0, 0.1)',
                          borderColor:
                            songbookFilter === option.slug
                              ? option.color
                              : theme =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'transparent',
                        },
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </>
              }
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
