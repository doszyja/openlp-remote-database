import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import {
  Container,
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
  Grid,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, MusicNote as MusicNoteIcon, Fullscreen as FullscreenIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSong, useDeleteSong, useSongs } from '../hooks';
import { useNotification } from '../contexts/NotificationContext';
import { parseVerses, getVerseDisplayLabel } from '../utils/verseParser';
import type { SongQueryDto } from '@openlp/shared';

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: song, isLoading, error } = useSong(id!);
  const deleteSong = useDeleteSong();
  const { showSuccess, showError } = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState<SongQueryDto>({
    page: 1,
    limit: 150,
  });
  const hasScrolledRef = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [search]);

  // Update search query when debounced search changes
  useEffect(() => {
    setSearchQuery((prev) => ({
      ...prev,
      search: debouncedSearch || undefined,
      page: 1,
    }));
  }, [debouncedSearch]);

  // Always fetch search results, even without a search query
  const { data: searchResults } = useSongs(debouncedSearch ? { ...searchQuery, search: debouncedSearch } : { ...searchQuery });

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteSong.mutateAsync(id);
      showSuccess('Song deleted successfully!');
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete song. Please try again.';
      showError(errorMessage);
      console.error('Failed to delete song:', error);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  // Handle scroll position when navigating to a song
  const handleSongClick = () => {
    // Save scroll position before navigation (Link will handle navigation)
    const listContainer = document.getElementById('search-songs-list');
    if (listContainer) {
      const scrollPosition = listContainer.scrollTop;
      sessionStorage.setItem('searchListScrollPosition', scrollPosition.toString());
    }
  };

  // Scroll to selected song when id changes (but list stays mounted)
  useLayoutEffect(() => {
    if (!id || !searchResults?.data) return;

    const songInResults = searchResults.data.some(song => song.id === id);
    if (!songInResults) return;

    // Small delay to ensure DOM is updated
    requestAnimationFrame(() => {
      const listContainer = document.getElementById('search-songs-list');
      if (!listContainer) return;

      const selectedItem = listContainer.querySelector(`[data-song-id="${id}"]`) as HTMLElement;
      if (selectedItem) {
        // Use scrollIntoView for reliable positioning
        selectedItem.scrollIntoView({ 
          behavior: 'instant', 
          block: 'center',
          inline: 'nearest'
        });
      }
    });
  }, [id, searchResults]);

  // Render song content separately - this will update when id changes, but layout stays stable
  const renderSongContent = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">Failed to load song. Please try again.</Alert>;
    }

    if (!song) {
      return <Alert severity="info">Song not found.</Alert>;
    }

    // Debug: Log verses to console
    console.log('Song verses:', song.verses, typeof song.verses, Array.isArray(song.verses));
    const parsedVerses = parseVerses(song.verses);
    console.log('Parsed verses count:', parsedVerses.length);
    console.log('Parsed verses:', JSON.stringify(parsedVerses, null, 2));

    return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to List
        </Button>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={isFullscreen}
                onChange={(e) => setIsFullscreen(e.target.checked)}
                size="small"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={0.5}>
                {isFullscreen ? <FullscreenIcon fontSize="small" /> : <ViewColumnIcon fontSize="small" />}
                <Typography variant="body2">
                  {isFullscreen ? 'Fullscreen' : 'Normal View'}
                </Typography>
              </Box>
            }
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/songs/${id}/edit`)}
            fullWidth={{ xs: true, sm: false }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            fullWidth={{ xs: true, sm: false }}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1">
          {song.title}
        </Typography>

        {song.number && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            #{song.number}
          </Typography>
        )}

        {song.tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2 }}>
            {song.tags.map((tag) => (
              <Chip key={tag.id} label={tag.name} variant="outlined" />
            ))}
          </Stack>
        )}
      </Paper>

      {song.chorus && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Chorus
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {song.chorus}
          </Typography>
        </Paper>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Verses ({parsedVerses.filter(v => v.content && v.content.trim()).length})
        </Typography>
        {parsedVerses.filter(v => v.content && v.content.trim()).length === 0 ? (
          <Alert severity="info">No verses found.</Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {parsedVerses
              .filter(v => v.content && v.content.trim())
              .map((verse, index) => (
                <Paper key={`verse-${verse.order}-${index}`} variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      Order: {verse.order}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {getVerseDisplayLabel(verse, index)}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {verse.content}
                  </Typography>
                </Paper>
              ))}
          </Stack>
        )}
      </Box>
    </>
    );
  };

  const songContent = renderSongContent();

  const searchColumn = (
    <Paper sx={{ p: 1.5, display: 'flex', flexDirection: 'column', width: '280px' }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: '1rem' }}>
        Search Songs
      </Typography>
      <TextField
        fullWidth
        placeholder="Search Entire Song..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        size="small"
        sx={{ mb: 1.5, flexShrink: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <MusicNoteIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Box 
        id="search-songs-list"
        sx={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: 'calc(100vh - 200px)', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#555' } }}
      >
        {searchResults?.data && searchResults.data.length > 0 && (
          <List dense sx={{ py: 0 }}>
            {searchResults.data.map((resultSong) => (
              <ListItem 
                key={resultSong.id} 
                disablePadding 
                sx={{ mb: 0.5 }}
                data-song-id={resultSong.id}
              >
                <ListItemButton
                  selected={resultSong.id === id}
                  onClick={handleSongClick}
                  dense
                  component={Link}
                  to={`/songs/${resultSong.id}`}
                  sx={{ 
                    py: 0.75, 
                    px: 1, 
                    borderRadius: 1,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&.Mui-selected': {
                      fontWeight: 600,
                      '& .MuiListItemText-primary': {
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={resultSong.title}
                    primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: resultSong.id === id ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        {search && searchResults?.data && searchResults.data.length === 0 && (
          <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
            No songs found.
          </Alert>
        )}
      </Box>
    </Paper>
  );

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
      {isFullscreen ? (
        <Box maxWidth={{ xs: '100%', sm: '900px' }} mx="auto" px={{ xs: 1, sm: 0 }}>
          {songContent}
        </Box>
      ) : (
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2} 
          alignItems="flex-start" 
          maxWidth="1200px" 
          mx="auto"
          width="100%"
        >
          <Box sx={{ width: { xs: '100%', md: '280px' }, display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              {searchColumn}
            </Box>
          </Box>
          <Box sx={{ width: { xs: '100%', md: '900px' }, flexShrink: 0 }} key={id}>
            {songContent}
          </Box>
        </Box>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Song?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{song?.title || 'this song'}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteSong.isPending}>
            {deleteSong.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

