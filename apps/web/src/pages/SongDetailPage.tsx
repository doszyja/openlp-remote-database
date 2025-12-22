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
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Slideshow as SlideshowIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useDeleteSong } from '../hooks';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { parseVerses, getVerseDisplayLabel } from '../utils/verseParser';
import { songsCache } from '../services/songs-cache';
import SongList from '../components/SongList';
import {
  useActiveSong,
  useServicePlans,
  useServicePlan,
  useSetActiveSong,
} from '../hooks/useServicePlans';

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasEditPermission, isAuthenticated } = useAuth();
  const deleteSong = useDeleteSong();
  const { showSuccess, showError } = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  const isFullscreen = false; // Always false for now
  const [isServiceView, setIsServiceView] = useState(false); // Default to false, only enabled for authenticated users
  const [search, setSearch] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Get all cached songs to ensure cache is loaded
  const { songs: allCachedSongs, isLoading: isCacheLoading } = useCachedSongs();

  // Service plan hooks - only enabled for authenticated users
  const { data: allPlans } = useServicePlans();
  const { data: activeSongData } = useActiveSong(isAuthenticated); // Wywołuj endpoint tylko dla zalogowanych użytkowników
  const { data: servicePlan } = useServicePlan(
    isAuthenticated && selectedPlanId ? selectedPlanId : ''
  );
  const setActiveSong = useSetActiveSong();

  // Disable service view if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated && isServiceView) {
      setIsServiceView(false);
    }
  }, [isAuthenticated, isServiceView]);

  // Auto-select plan if there's an active song
  useEffect(() => {
    if (isAuthenticated && activeSongData?.servicePlan?.id && !selectedPlanId) {
      setSelectedPlanId(activeSongData.servicePlan.id);
    }
  }, [isAuthenticated, activeSongData, selectedPlanId]);

  // Get song from cache
  const song = useMemo(() => {
    if (!id) return null;
    return songsCache.getSongById(id);
  }, [id]);

  // Parse verses with verseOrder and lyricsXml (1:1 transparent with SQLite)
  const parsedVerses = useMemo(() => {
    if (!song) return [];
    return parseVerses(
      song.verses,
      song.verseOrder || null,
      song.lyricsXml || null,
      song.versesArray || null
    );
  }, [song]);

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
  const { results: searchResults, isLoading: isSearchLoading } = useCachedSongSearch(search);

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

    return (
      <>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="flex-end"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={{ xs: 2, md: 3 }}
          flexWrap="wrap"
          gap={{ xs: 1.5, sm: 1 }}
        >
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
            {hasEditPermission && (
              <Box display="flex" gap={{ xs: 0.25, sm: 0.5 }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/songs/${id}/edit`)}
                  size="small"
                  style={{marginRight: 8}}
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
                  <Box
                    key={`verse-${verse.order}-${index}`}
                    sx={{
                      position: 'relative',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'relative',
                        mb: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        lineHeight: 1,
                      }}
                    >
                      {getVerseDisplayLabel(verse, index)}
                    </Typography>
                    <Paper
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
                        variant="body1"
                        sx={{
                          whiteSpace: 'pre-line',
                          lineHeight: 1.8,
                          fontSize: { xs: '1.04rem', sm: '1.09rem', md: '1.14rem' },
                        }}
                      >
                        {verse.content}
                      </Typography>
                    </Paper>
                  </Box>
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
    parsedVerses,
    isFetching,
    isLoading,
    id,
    hasEditPermission,
    navigate,
  ]);

  // Calculate list height for SongDetailPage - use full available height
  // Note: viewportHeight is now the container height, not window.innerHeight
  const calculateListHeight = useCallback((containerHeight: number) => {
    // Container height already accounts for available space, just subtract minimal padding
    // Search input height is already handled in SongList component
    const padding = 20; // Minimal padding for visual spacing
    const calculatedHeight = containerHeight - padding;
    // Use full container height minus minimal overhead
    return Math.max(300, calculatedHeight);
  }, []);

  // Service view: Get active song and prepare verse content (only for authenticated users)
  const activeSong = isAuthenticated ? activeSongData?.song : null;
  const activeSongVerses = useMemo(() => {
    if (!isAuthenticated || !activeSong) return [];
    // Normalize verses to convert undefined labels to null (parseVerses expects label: string | null when verses is an array)
    const normalizedVerses: string | Array<{
      order: number;
      content: string;
      label: string | null;
      originalLabel?: string;
    }> = typeof activeSong.verses === 'string'
      ? activeSong.verses
      : activeSong.verses.map(v => ({
          order: v.order,
          content: v.content,
          label: v.label ?? null,
          originalLabel: v.originalLabel,
        }));
    // Normalize versesArray to convert undefined labels to null
    const normalizedVersesArray: Array<{
      order: number;
      content: string;
      label?: string;
      originalLabel?: string;
    }> | null = activeSong.versesArray
      ? activeSong.versesArray.map(v => ({
          order: v.order,
          content: v.content,
          label: v.label,
          originalLabel: v.originalLabel,
        }))
      : null;
    const parsed = parseVerses(
      normalizedVerses,
      activeSong.verseOrder || null,
      activeSong.lyricsXml || null,
      normalizedVersesArray
    ).filter(v => v.content && v.content.trim());
    const allContent = parsed.map((v, idx) => ({
      type: v.type || 'verse',
      content: v.content,
      label: v.label || null,
      stepLabel: getVerseDisplayLabel(v, idx),
    }));
    return allContent;
  }, [isAuthenticated, activeSong]);

  // Reset verse index when active song changes in service view
  useEffect(() => {
    if (!isAuthenticated) return;
    // When we switch to a different active song, always start from the first verse
    setCurrentVerseIndex(0);
  }, [isAuthenticated, activeSong?.id]);

  // Handle verse navigation
  const handleNextVerse = useCallback(() => {
    if (currentVerseIndex < activeSongVerses.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
    }
  }, [currentVerseIndex, activeSongVerses.length]);

  const handlePreviousVerse = useCallback(() => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(prev => prev - 1);
    }
  }, [currentVerseIndex]);

  // Handle setting active song
  const handleSetActive = useCallback(
    async (itemId: string) => {
      if (!selectedPlanId) return;
      try {
        await setActiveSong.mutateAsync({
          planId: selectedPlanId,
          data: { itemId, isActive: true },
        });
        showSuccess('Pieśń została ustawiona jako aktywna!');
      } catch (error) {
        showError('Nie udało się ustawić pieśni jako aktywnej.');
      }
    },
    [selectedPlanId, setActiveSong, showSuccess, showError]
  );

  // Keyboard navigation for verse switching in service view (only for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !isServiceView || !activeSong) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentVerseIndex > 0) {
          setCurrentVerseIndex(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (currentVerseIndex < activeSongVerses.length - 1) {
          setCurrentVerseIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAuthenticated, isServiceView, activeSong, currentVerseIndex, activeSongVerses.length]);

  // Service plan songs list (only for authenticated users)
  const planSongs = useMemo(() => {
    if (!isAuthenticated || !servicePlan) return [];
    return [...servicePlan.items].sort((a, b) => a.order - b.order);
  }, [isAuthenticated, servicePlan]);

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
          <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
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
            onSongClick={songId => {
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
    [
      isSearchLoadingState,
      search,
      allSearchSongs,
      id,
      handleSongClick,
      navigate,
      calculateListHeight,
    ]
  );

  // Service view: Plan songs column
  const planSongsColumn = useMemo(
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
        <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
            Plan Nabożeństwa
          </Typography>
          {allPlans && allPlans.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Wybierz plan</InputLabel>
              <Select
                value={selectedPlanId || ''}
                onChange={e => setSelectedPlanId(e.target.value)}
                label="Wybierz plan"
              >
                {allPlans.map(plan => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {!selectedPlanId ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Wybierz plan nabożeństwa
            </Alert>
          ) : planSongs.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Brak pieśni w planie
            </Alert>
          ) : (
            <List dense>
              {planSongs.map(item => (
                <ListItem
                  key={item.id}
                  disablePadding
                  sx={{
                    mb: 0.5,
                    border: theme =>
                      item.isActive
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: item.isActive ? 'action.selected' : 'background.paper',
                  }}
                >
                  <ListItemButton
                    onClick={() => {
                      if (!item.isActive) {
                        handleSetActive(item.id);
                      }
                    }}
                    selected={item.isActive}
                  >
                    <ListItemText
                      primary={item.songTitle}
                      secondary={item.notes}
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: item.isActive ? 600 : 400,
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                    {item.isActive && (
                      <Chip label="AKTYWNA" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    ),
    [allPlans, selectedPlanId, planSongs, handleSetActive]
  );

  // Service view: Active song display column
  const activeSongColumn = useMemo(() => {
    if (!activeSong || activeSongVerses.length === 0) {
      return (
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Alert severity="info">
            {!activeSong ? 'Brak aktywnej pieśni' : 'Brak zwrotek w pieśni'}
          </Alert>
        </Paper>
      );
    }

    const currentVerse = activeSongVerses[currentVerseIndex];
    const displayTitle = activeSong.number
      ? `${activeSong.title} (${activeSong.number})`
      : activeSong.title;

    return (
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            {displayTitle}
          </Typography>
          {activeSongData?.servicePlan && (
            <Typography variant="caption" color="text.secondary">
              {activeSongData.servicePlan.name}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              width: '100%',
              textAlign: 'center',
              mb: 2,
            }}
          >
            {currentVerse?.label && (
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                }}
              >
                {currentVerse.label}
              </Typography>
            )}
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-line',
                lineHeight: 1.8,
                fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.35rem' },
              }}
            >
              {currentVerse?.content}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton onClick={handlePreviousVerse} disabled={currentVerseIndex === 0} size="large">
            <NavigateBeforeIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {currentVerseIndex + 1} / {activeSongVerses.length}
          </Typography>
          <IconButton
            onClick={handleNextVerse}
            disabled={currentVerseIndex >= activeSongVerses.length - 1}
            size="large"
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      </Paper>
    );
  }, [
    activeSong,
    activeSongVerses,
    currentVerseIndex,
    handleNextVerse,
    handlePreviousVerse,
    activeSongData,
  ]);

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
      {/* Mobile back button */}
      {isMobile && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/songs')}
          variant="outlined"
          size="small"
          sx={{
            mb: 2,
            borderColor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
            color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit'),
            '&:hover': {
              borderColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            display: { xs: 'flex', sm: 'none' },
          }}
        >
          Wstecz
        </Button>
      )}
      {isAuthenticated && isServiceView ? (
        // Service view: 3-column layout
        <Box
          display="flex"
          flexDirection={{ xs: 'column', lg: 'row' }}
          gap={2}
          alignItems={{ xs: 'flex-start', lg: 'stretch' }}
          maxWidth={{ xs: '100%', lg: '1600px' }}
          mx="auto"
          width="100%"
          sx={{ px: { xs: 0, md: 2 }, overflowX: 'hidden' }}
        >
          {/* Column 1: Song List */}
          <Box
            sx={{
              width: { xs: '100%', lg: '300px' },
              minWidth: { xs: '100%', lg: '300px' },
              maxWidth: { xs: '100%', lg: '300px' },
              flexShrink: 0,
              display: { xs: 'none', lg: 'flex' },
              flexDirection: 'column',
            }}
          >
            <Box sx={{ position: 'sticky', top: 20, height: '100%', minHeight: '100%' }}>
              {searchColumn}
            </Box>
          </Box>
          {/* Column 2: Plan Songs */}
          <Box
            sx={{
              width: { xs: '100%', lg: '300px' },
              minWidth: { xs: '100%', lg: '300px' },
              maxWidth: { xs: '100%', lg: '300px' },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ position: 'sticky', top: 20, height: '100%', minHeight: '100%' }}>
              {planSongsColumn}
            </Box>
          </Box>
          {/* Column 3: Active Song Display */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: { xs: '100%', lg: 'auto' },
            }}
          >
            <Box key={id}>{activeSongColumn}</Box>
          </Box>
        </Box>
      ) : isFullscreen ? (
        <Box maxWidth={{ xs: '100%', sm: '800px', md: '1000px', lg: '1200px' }} mx="auto">
          <Box key={id}>{songContent}</Box>
        </Box>
      ) : (
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={{ xs: 2, md: 2 }}
          alignItems={{ xs: 'flex-start', md: 'stretch' }}
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
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                width: { md: '240px', lg: '320px' },
                position: 'sticky',
                top: 20,
                height: '100%',
                minHeight: '100%',
              }}
            >
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
