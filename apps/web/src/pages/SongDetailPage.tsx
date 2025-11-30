import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Fullscreen as FullscreenIcon,
  ViewColumn as ViewColumnIcon,
  Slideshow as SlideshowIcon,
} from '@mui/icons-material';
import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useDeleteSong } from '../hooks';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { parseVerses, getVerseDisplayLabel } from '../utils/verseParser';
import { songsCache } from '../services/songs-cache';
import SongList from '../components/SongList';

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasEditPermission } = useAuth();
  const deleteSong = useDeleteSong();
  const { showSuccess, showError } = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [search, setSearch] = useState('');
  const [showLoading, setShowLoading] = useState(false);

  // Get all cached songs to ensure cache is loaded
  const { songs: allCachedSongs, isLoading: isCacheLoading } = useCachedSongs();
  
  // Get song from cache
  const song = useMemo(() => {
    if (!id) return null;
    return songsCache.getSongById(id);
  }, [id, allCachedSongs]);

  // Loading state: show loading only if cache is loading and we don't have the song
  const isLoading = isCacheLoading && !song;
  const isFetching = false; // No fetching needed, we use cache
  const error = null; // No error from cache (if song not found, song will be null)

  // Debounce loading state to prevent blinking
  // Only show loading if we don't have data (initial load) and it's actually fetching
  useEffect(() => {
    // Show loading only if:
    // 1. We don't have data (initial load or error recovery)
    // 2. It's actually fetching
    // 3. After debounce delay (to prevent blinking on fast responses)
    const shouldShowLoading = !song && isFetching;

    if (shouldShowLoading) {
      const timer = setTimeout(() => {
        // Double-check that we still don't have data and are still fetching
        if (!song && isFetching) {
          setShowLoading(true);
        }
      }, 200); // Show loading only after 200ms
      return () => {
        clearTimeout(timer);
        setShowLoading(false);
      };
    } else {
      setShowLoading(false);
    }
  }, [song, isFetching]);

  // Scroll to top when id changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Use cached search for instant results when searching, otherwise show all songs
  const { results: searchResults, isLoading: isSearchLoading } =
    useCachedSongSearch(search);

  // Memoize search results to prevent unnecessary re-renders
  // Show all songs (no limit) - same as SongListPage
  const allSearchSongs = useMemo(() => {
    if (!search.trim()) {
      // When no search, show all songs
      return allCachedSongs || [];
    }
    // When searching, show all results
    return searchResults || [];
  }, [search, searchResults, allCachedSongs]);

  const isSearchLoadingState = search.trim() ? isSearchLoading : isCacheLoading;

  const handleDelete = async () => {
    if (!id || deleteSong.isPending) return;

    try {
      await deleteSong.mutateAsync(id);
      showSuccess('Pieśń została usunięta pomyślnie!');
      navigate('/');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Nie udało się usunąć pieśni. Spróbuj ponownie.';
      showError(errorMessage);
      console.error('Failed to delete song:', error);
    } finally {
      setDeleteDialogOpen(false);
    }
  };


  // Handle scroll position when navigating to a song
  const handleSongClick = useCallback(() => {
    // Save scroll position before navigation (Link will handle navigation)
    const listContainer = document.getElementById('search-songs-list');
    if (listContainer) {
      const scrollPosition = listContainer.scrollTop;
      sessionStorage.setItem('searchListScrollPosition', scrollPosition.toString());
    }
  }, []);

  // Scroll to selected song in the list container when id changes
  useLayoutEffect(() => {
    if (!id || !allSearchSongs.length) return;

    const songInResults = allSearchSongs.some(song => song.id === id);
    if (!songInResults) return;

    // Small delay to ensure DOM is updated
    requestAnimationFrame(() => {
      const listContainer = document.getElementById('search-songs-list');
      if (!listContainer) return;

      const selectedItem = listContainer.querySelector(`[data-song-id="${id}"]`) as HTMLElement;
      if (selectedItem && listContainer) {
        // Calculate scroll position within the container, not the window
        const containerRect = listContainer.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        const scrollTop = listContainer.scrollTop;
        const itemOffsetTop = itemRect.top - containerRect.top + scrollTop;
        const containerHeight = listContainer.clientHeight;
        const itemHeight = itemRect.height;

        // Center the item in the container
        const targetScrollTop = itemOffsetTop - containerHeight / 2 + itemHeight / 2;

        // Scroll only the container, not the window
        listContainer.scrollTop = targetScrollTop;
      }
    });
  }, [id, allSearchSongs]);

  // Memoize song content to prevent unnecessary re-renders
  const songContent = useMemo(() => {
    if (showLoading) {
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
              theme.palette.mode === 'dark'
                ? 'rgba(26, 35, 50, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">Nie udało się załadować pieśni. Spróbuj ponownie.</Alert>;
    }

    // Don't show "not found" message if we're still fetching or loading
    // This prevents the message from blinking when switching between songs
    if (!song && !isFetching && !isLoading) {
      return <Alert severity="info">Nie znaleziono pieśni.</Alert>;
    }

    // If we don't have song but are still loading/fetching, show nothing (or keep previous content)
    // The loading spinner will be shown by showLoading state
    if (!song) {
      return null;
    }

    // Debug: Log verses to console
    const parsedVerses = parseVerses(song.verses);
    return (
      <>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={{ xs: 2, md: 3 }}
          flexWrap="wrap"
          gap={{ xs: 1.5, sm: 1 }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/songs')}
            size="small"
            variant="outlined"
            sx={{
              borderColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
              color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit'),
              '&:hover': {
                borderColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Wstecz
          </Button>
          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1, md: 2 }}
            alignItems="center"
            flexWrap="wrap"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              gap: { xs: 0.5, sm: 1 },
            }}
          >
            <Button
              variant="outlined"
              startIcon={<SlideshowIcon />}
              onClick={() => navigate(`/songs/${id}/presentation`)}
              size="small"
              sx={{
                borderColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.23)',
                color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit'),
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 },
                minWidth: { xs: 'auto', sm: 'auto' },
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.5)'
                      : 'rgba(0, 0, 0, 0.4)',
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              Prezentacja
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={!isFullscreen}
                  onChange={e => setIsFullscreen(!e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  {isFullscreen ? (
                    <FullscreenIcon fontSize="small" />
                  ) : (
                    <ViewColumnIcon fontSize="small" />
                  )}
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    {isFullscreen ? 'Pełna szerokość' : 'Normalny widok'}
                  </Typography>
                </Box>
              }
              sx={{ display: { xs: 'none', lg: 'flex' }, m: 0 }}
            />
            {hasEditPermission && (
              <Box display="flex" gap={{ xs: 0.25, sm: 0.5 }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/songs/${id}/edit`)}
                  size="small"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 1.5 },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edytuj
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  size="small"
                  sx={{
                    borderColor: theme =>
                      theme.palette.mode === 'dark' ? theme.palette.error.main : undefined,
                    color: theme =>
                      theme.palette.mode === 'dark' ? theme.palette.error.light : undefined,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 1.5 },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      borderColor: theme =>
                        theme.palette.mode === 'dark' ? theme.palette.error.light : undefined,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? `${theme.palette.error.main}20` : undefined,
                    },
                  }}
                >
                  Usuń
                </Button>
              </Box>
            )}
          </Stack>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            mb: { xs: 2, md: 3 },
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
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
              fontWeight: 500,
              mb: 0.5,
              lineHeight: 1.3,
            }}
          >
            {song.title}
          </Typography>

          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mt={1}>
            {song.number && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                #{song.number}
              </Typography>
            )}
            {song.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {song.tags.map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: '0.75rem', height: 24 }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Paper>

        {song.chorus && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              mb: 2,
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
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 1.5,
                fontSize: '0.95rem',
                color: 'text.secondary',
              }}
            >
              Refren
            </Typography>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-line',
                lineHeight: 1.8,
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
              }}
            >
              {song.chorus}
            </Typography>
          </Paper>
        )}

        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1.5,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Zwrotki ({parsedVerses.filter(v => v.content && v.content.trim()).length})
          </Typography>
          {parsedVerses.filter(v => v.content && v.content.trim()).length === 0 ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Brak zwrotek.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {parsedVerses
                .filter(v => v.content && v.content.trim())
                .map((verse, index) => (
                  <Paper
                    key={`verse-${verse.order}-${index}`}
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      bgcolor: 'background.paper',
                      boxShadow: theme =>
                        theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      border: theme =>
                        theme.palette.mode === 'dark'
                          ? '1px solid rgba(255, 255, 255, 0.08)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        display: 'block',
                        mb: 1,
                      }}
                    >
                      {getVerseDisplayLabel(verse, index)}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-line',
                        lineHeight: 1.8,
                        fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                      }}
                    >
                      {verse.content}
                    </Typography>
                  </Paper>
                ))}
            </Stack>
          )}
        </Box>
      </>
    );
  }, [
    showLoading,
    error,
    song,
    isFetching,
    isLoading,
    id,
    hasEditPermission,
    navigate,
    isFullscreen,
    setIsFullscreen,
  ]);

  // Calculate list height for SongDetailPage
  const calculateListHeight = useCallback((viewportHeight: number) => {
    // Account for header, search box, and padding
    const headerHeight = 60;
    const searchHeight = 120;
    const padding = 40;
    const calculatedHeight = viewportHeight - headerHeight - searchHeight - padding;
    return Math.max(300, calculatedHeight);
  }, []);

  // Memoize search column to prevent unnecessary re-renders
  const searchColumn = useMemo(
    () => (
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
          >
            Szukaj Pieśni
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.7rem', md: '0.75rem' },
              fontStyle: 'italic',
            }}
          >
            Ctrl+F / Cmd+F
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <SongList
            songs={allSearchSongs}
            onSongClick={(songId) => {
              handleSongClick();
              navigate(`/songs/${songId}`);
            }}
            currentSongId={id}
            showSearch={true}
            searchValue={search}
            onSearchChange={setSearch}
            isLoading={isSearchLoadingState}
            emptyMessage="Nie znaleziono pieśni."
            calculateHeight={calculateListHeight}
          />
        </Box>
      </Paper>
    ),
    [isSearchLoadingState, search, allSearchSongs, id, handleSongClick, navigate, calculateListHeight]
  );

  return (
    <Box
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3, md: 4 },
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      {isFullscreen ? (
        <Box maxWidth={{ xs: '100%', sm: '800px', md: '1000px', lg: '1200px' }} mx="auto">
          <Box key={id}>{songContent}</Box>
        </Box>
      ) : (
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={{ xs: 2, md: 2 }}
          alignItems="flex-start"
          maxWidth={{ xs: '100%', md: '1024px', lg: '1200px' }}
          mx="auto"
          width="100%"
          sx={{ px: { xs: 0, md: 2 }, overflowX: 'hidden' }}
        >
          <Box
            sx={{
              width: { xs: '100%', md: isFullscreen ? 0 : '260px', lg: isFullscreen ? 0 : '320px' },
              minWidth: {
                xs: '100%',
                md: isFullscreen ? 0 : '260px',
                lg: isFullscreen ? 0 : '320px',
              },
              maxWidth: {
                xs: '100%',
                md: isFullscreen ? 0 : '260px',
                lg: isFullscreen ? 0 : '320px',
              },
              overflow: 'hidden',
              flexShrink: 0,
              transition:
                'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box sx={{ width: { md: '240px', lg: '320px' }, position: 'sticky', top: 20 }}>
              {searchColumn}
            </Box>
          </Box>
          <Box
            sx={{
              width: {
                xs: '100%',
                md: isFullscreen ? '100%' : 'calc(100% - 260px)',
                lg: isFullscreen ? '100%' : 'calc(100% - 320px)',
              },
              maxWidth: { xs: '100%', md: '100%', lg: isFullscreen ? '1200px' : '1000px' },
              flexShrink: 0,
              transition:
                'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
            }}
          >
            <Box key={id}>{songContent}</Box>
          </Box>
        </Box>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Usuń Pieśń?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz usunąć "{song?.title || 'tę pieśń'}"? Tej operacji nie można cofnąć.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
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
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteSong.isPending}
          >
            {deleteSong.isPending ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
