import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
} from '@mui/material';
import { Add as AddIcon, MusicNote as MusicNoteIcon, Download as DownloadIcon, ErrorOutline as ErrorOutlineIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useAuth } from '../contexts/AuthContext';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import type { SongListCacheItem } from '@openlp/shared';

// Memoized song list item to prevent unnecessary re-renders
const SongListItem = memo(({ song, onNavigate }: { 
  song: SongListCacheItem; 
  onNavigate: (path: string) => void;
}) => {
  const displayTitle = song.number
    ? `${song.title} (${song.number})`
    : song.title;
  
  const handleClick = useCallback(() => {
    onNavigate(`/songs/${song.id}`);
  }, [song.id, onNavigate]);
  
  return (
    <ListItem
      disablePadding
      sx={{
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <ListItemButton onClick={handleClick}>
        <ListItemText
          primary={displayTitle}
          primaryTypographyProps={{
            variant: 'body1',
            sx: {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.95rem',
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
});

SongListItem.displayName = 'SongListItem';

export default function SongListPage() {
  const navigate = useNavigate();
  const { hasEditPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<number>(0);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const exportZip = useExportZip();

  // Debounce search input - faster for cached searches (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200); // 200ms debounce for cached search (instant, no API calls)

    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
    setAllSongs([]);
    setHasMore(true);
  }, [debouncedSearch]);

  // Use cached songs for both search and initial list (no API calls needed)
  const { songs: cachedSongs, isLoading: isCacheLoading, error, refetch: refetchCache } = useCachedSongs();
  const { results: searchResults, isLoading: isSearchLoading } = useCachedSongSearch(debouncedSearch);
  
  // Use cached search results if we have a search query, otherwise use cached songs list
  const useCacheForSearch = !!debouncedSearch;
  
  // Determine loading state
  const isLoading = useCacheForSearch ? isSearchLoading : isCacheLoading;

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
    if (error && page === 1) {
      document.body.classList.add('error-state');
      return () => {
        document.body.classList.remove('error-state');
      };
    } else {
      document.body.classList.remove('error-state');
    }
  }, [error, page]);

  // Update allSongs state only when data actually changes
  useEffect(() => {
    if (useCacheForSearch) {
      // Use cached search results - only update if different
      setAllSongs((prev) => {
        // Quick length check first
        if (prev.length !== searchResults.length) {
          return searchResults;
        }
        // Deep comparison of IDs to avoid unnecessary updates
        const prevIds = prev.map(s => s.id).join(',');
        const newIds = searchResults.map(s => s.id).join(',');
        if (prevIds !== newIds) {
          return searchResults;
        }
        return prev; // No change, keep previous reference
      });
      setHasMore(false); // No pagination for cached search
    } else if (cachedSongs && cachedSongs.length > 0) {
      // Use cached songs list (paginated client-side)
      const itemsPerPage = 200;
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedSongs = cachedSongs.slice(startIndex, endIndex);
      
      if (page === 1) {
        setAllSongs(paginatedSongs);
      } else {
        setAllSongs((prev) => {
          // Only append if not already added
          const existingIds = new Set(prev.map(s => s.id));
          const newSongs = paginatedSongs.filter(s => !existingIds.has(s.id));
          if (newSongs.length > 0) {
            return [...prev, ...newSongs];
          }
          return prev;
        });
      }
      setHasMore(endIndex < cachedSongs.length);
    }
  }, [useCacheForSearch, searchResults, cachedSongs, page]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

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
  if (error && page === 1) {
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
          backgroundColor: (theme) => 
            theme.palette.mode === 'dark' 
              ? 'rgba(26, 35, 50, 0.98)' 
              : 'rgba(255, 255, 255, 0.98)',
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
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: (theme) =>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
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

  return (
    <Box sx={{ py: { xs: 1.5, sm: 2.5, md: 4 }, px: { xs: 1.5, sm: 2.5, md: 4, lg: 6 }, position: 'relative', maxWidth: { xs: '100%', sm: '100%', md: '100%' }, width: '100%' }}>
      {/* Skeleton loading for list items - only show after debounce delay */}
      {showLoadingAnimation && isLoading && page === 1 && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
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
          <List dense sx={{ py: 1 }}>
            {[...Array(10)].map((_, index) => (
              <ListItem 
                key={index} 
                disablePadding
                sx={{
                  borderBottom: (theme) =>
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
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
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
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                            borderRadius: 0.5,
                          }}
                        />
                      ) : null
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Normal content when not loading or loading more pages */}
      {(!showLoadingAnimation || page > 1) && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
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
              startIcon={isExporting || exportZip.isFetching ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={handleExportZip}
              disabled={isExporting || exportZip.isFetching || !!error}
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : undefined,
                '&:hover': {
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
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
                     mb: { xs: 1.5, sm: 2 },
                     bgcolor: 'background.paper',
                     boxShadow: (theme) =>
                       theme.palette.mode === 'dark'
                         ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                         : '0 4px 16px rgba(0, 0, 0, 0.08)',
                     border: (theme) =>
                       theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                   }}
                 >
                   <TextField
                     fullWidth
                     placeholder="Szukaj pieśni..."
                     value={search}
                     onChange={(e) => handleSearch(e.target.value)}
                     size="small"
                     InputProps={{
                       startAdornment: (
                         <InputAdornment position="start">
                           <MusicNoteIcon fontSize="small" />
                         </InputAdornment>
                       ),
                     }}
                     sx={{
                       '& .MuiInputBase-input': {
                         fontSize: '16px', // Minimum 16px to prevent iOS zoom
                         py: { xs: 0.75, sm: 1 },
                       },
                     }}
                   />
                 </Paper>

      {allSongs.length === 0 && !isLoading && !error && page === 1 && cachedSongs && cachedSongs.length === 0 && (
        <Alert severity="info">Nie znaleziono pieśni. Utwórz pierwszą pieśń!</Alert>
      )}

      {allSongs.length > 0 && !error && (
        <Paper
          elevation={0}
          sx={{
            maxHeight: 'calc(100vh - 250px)',
            overflow: 'auto',
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          <List dense>
            {allSongs.map((song) => (
              <SongListItem
                key={song.id}
                song={song}
                onNavigate={navigate}
              />
            ))}
          </List>
          
          {/* Load More button */}
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={isLoading}
                size="small"
                startIcon={isLoading && page > 1 ? <CircularProgress size={16} /> : null}
                sx={{
                  color: 'text.primary',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                  '&:disabled': {
                    borderColor: 'divider',
                    color: 'text.disabled',
                  },
                }}
              >
                {isLoading && page > 1 ? 'Ładowanie...' : 'Załaduj więcej'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
        </>
      )}
    </Box>
  );
}

