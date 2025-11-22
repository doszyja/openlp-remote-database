import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
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
} from '@mui/material';
import { Add as AddIcon, MusicNote as MusicNoteIcon } from '@mui/icons-material';
import { useSongs } from '../hooks/useSongs';
import type { SongQueryDto } from '@openlp/shared';

export default function SongListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
    setAllSongs([]);
    setHasMore(true);
  }, [debouncedSearch]);

  // Memoize query object to prevent unnecessary re-renders
  const query = useMemo<SongQueryDto>(() => {
    const q: SongQueryDto = {
      page,
      limit: 200,
    };
    if (debouncedSearch) {
      q.search = debouncedSearch;
    }
    return q;
  }, [page, debouncedSearch]);

  const { data, isLoading, error } = useSongs(query);

  // Update allSongs when new data arrives
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllSongs(data.data);
      } else {
        setAllSongs((prev) => [...prev, ...data.data]);
      }
      setHasMore(data.data.length === 200 && data.data.length > 0);
    }
  }, [data, page]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <Container maxWidth="md" sx={{ py: 2, position: 'relative' }}>
      {/* Loading overlay for initial load */}
      {isLoading && page === 1 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1">
          Songs
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/songs/new')}
            size="small"
          >
            Add Song
          </Button>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="body2" sx={{ minWidth: 60 }}>
          Search:
        </Typography>
        <TextField
          fullWidth
          placeholder="Search Entire Song..."
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
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load songs. Please try again.
        </Alert>
      )}

      {allSongs.length === 0 && !isLoading && (
        <Alert severity="info">No songs found. Create your first song!</Alert>
      )}

      {allSongs.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto',
          }}
        >
          <List dense>
            {allSongs.map((song) => {
              // Format song title with author if available
              const displayTitle = song.number
                ? `${song.title} (${song.number})`
                : song.title;
              
              return (
                <ListItem
                  key={song.id}
                  disablePadding
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemButton onClick={() => navigate(`/songs/${song.id}`)}>
                    <ListItemText
                      primary={displayTitle}
                      primaryTypographyProps={{
                        variant: 'body1',
                        sx: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          
          {/* Load More button */}
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={isLoading}
                startIcon={isLoading && page > 1 ? <CircularProgress size={16} /> : null}
              >
                {isLoading && page > 1 ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
}

