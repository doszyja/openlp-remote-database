import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { Add as AddIcon, MusicNote as MusicNoteIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useSongs } from '../hooks/useSongs';
import { useAuth } from '../contexts/AuthContext';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import type { SongQueryDto } from '@openlp/shared';

export default function SongListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<number>(0);
  const exportZip = useExportZip();

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

  const handleExportZip = async () => {
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
  };

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4, lg: 6 }, position: 'relative', maxWidth: { xs: '100%', sm: '100%', md: '100%' }, width: '100%' }}>
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
            borderRadius: 2,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography 
          variant="h5" 
          component="h1"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}
        >
          Pieśni
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {isAuthenticated && (
            <Button
              variant="outlined"
              startIcon={isExporting || exportZip.isFetching ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={handleExportZip}
              disabled={isExporting || exportZip.isFetching}
              size="small"
            >
              {isExporting || exportZip.isFetching ? 'Eksportowanie...' : 'Eksportuj ZIP'}
            </Button>
          )}
          {isAuthenticated && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/songs/new')}
              size="small"
            >
              Dodaj Pieśń
            </Button>
          )}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
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
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się załadować pieśni. Spróbuj ponownie.
        </Alert>
      )}

      {allSongs.length === 0 && !isLoading && (
        <Alert severity="info">Nie znaleziono pieśni. Utwórz pierwszą pieśń!</Alert>
      )}

      {allSongs.length > 0 && (
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
                          fontSize: '0.95rem',
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
                size="small"
                startIcon={isLoading && page > 1 ? <CircularProgress size={16} /> : null}
              >
                {isLoading && page > 1 ? 'Ładowanie...' : 'Załaduj więcej'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

