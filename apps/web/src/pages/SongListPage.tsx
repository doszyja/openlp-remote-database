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
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useAuth } from '../contexts/AuthContext';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import SongList from '../components/SongList';

export default function SongListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasEditPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<number>(0);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const exportZip = useExportZip();
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
  const displaySongs = useMemo(() => {
    if (useCacheForSearch) {
      return searchResults || [];
    }
    return cachedSongs || [];
  }, [useCacheForSearch, searchResults, cachedSongs]);

  // Get first song ID for auto-selection (only when not searching and songs are loaded)
  const firstSongId = useMemo(() => {
    if (useCacheForSearch || !displaySongs || displaySongs.length === 0) {
      return undefined;
    }
    return displaySongs[0]?.id;
  }, [useCacheForSearch, displaySongs]);

  // Check if we should auto-navigate (before rendering to prevent visual jump)
  // Don't auto-navigate on mobile - show list instead
  const shouldAutoNavigate = useMemo(() => {
    return (
      !isMobile && // Don't auto-navigate on mobile
      location.pathname === '/songs' &&
      !hasAutoNavigatedRef.current &&
      !isLoading &&
      !useCacheForSearch &&
      !!firstSongId
    );
  }, [isMobile, location.pathname, isLoading, useCacheForSearch, firstSongId]);

  // Auto-navigate to first song on initial load (only if we're on /songs exactly, not /songs/:id)
  // Use useLayoutEffect to navigate synchronously before browser paints, preventing visual jump
  useLayoutEffect(() => {
    if (!shouldAutoNavigate) return;

    hasAutoNavigatedRef.current = true;
    // Use replace: true to avoid adding to history and prevent visual jump
    navigate(`/songs/${firstSongId}`, { replace: true });
  }, [shouldAutoNavigate, firstSongId, navigate]);

  // Calculate list height based on viewport
  const calculateListHeight = useCallback((viewportHeight: number) => {
    // Account for header, search box, padding, and buttons
    const headerHeight = 80;
    const searchHeight = 80;
    const padding = 40;
    const calculatedHeight = viewportHeight - headerHeight - searchHeight - padding;
    return Math.min(calculatedHeight, 800);
  }, []);

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
        py: { xs: 1.5, sm: 2.5, md: 4 },
        px: { xs: 1.5, sm: 2.5, md: 4, lg: 6 },
        position: 'relative',
        maxWidth: { xs: '100%', sm: '100%', md: '100%' },
        width: '100%',
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
            mb={2}
            flexWrap="wrap"
            gap={1}
          >
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
              p: { xs: 1.5, sm: 2 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <SongList
              songs={displaySongs}
              onSongClick={songId => navigate(`/songs/${songId}`)}
              currentSongId={firstSongId}
              showSearch={true}
              searchValue={search}
              onSearchChange={setSearch}
              isLoading={isLoading}
              emptyMessage={
                cachedSongs && cachedSongs.length === 0
                  ? 'Nie znaleziono pieśni. Utwórz pierwszą pieśń!'
                  : 'Nie znaleziono pieśni.'
              }
              calculateHeight={calculateListHeight}
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
