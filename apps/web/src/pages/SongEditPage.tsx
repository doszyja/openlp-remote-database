import { useNavigate, useParams } from 'react-router-dom';
import { Box, Alert, CircularProgress, Button, Stack } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useSong, useUpdateSong } from '../hooks';
import { useCachedSongs } from '../hooks/useCachedSongs';
import SongForm from '../components/SongForm';
import { useNotification } from '../contexts/NotificationContext';
import type { UpdateSongDto } from '@openlp/shared';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Always fetch fresh data from server when editing (forceRefresh = true)
  const { data: song, isFetching, error, refetch } = useSong(id!, { forceRefresh: true });
  const updateSong = useUpdateSong();
  const { showSuccess, showError } = useNotification();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const navigateRef = useRef(navigate);
  const { songs: allCachedSongs } = useCachedSongs();

  // Force refetch on mount to ensure we have the latest data from server
  useEffect(() => {
    if (id) {
      console.log('[SongEditPage] Forcing refetch of song data from server...');
      refetch();
    }
  }, [id, refetch]);

  // Update navigate ref when it changes
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Block browser navigation if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty]);

  // Intercept in-app navigation
  useEffect(() => {
    if (!isFormDirty) return;

    const handlePopState = (_event: PopStateEvent) => {
      if (isFormDirty) {
        const confirmed = window.confirm(
          'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?'
        );
        if (!confirmed) {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFormDirty]);

  // Custom navigation wrapper that checks for dirty form
  const handleNavigation = (path: string) => {
    if (isFormDirty) {
      const confirmed = window.confirm(
        'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?'
      );
      if (confirmed) {
        setIsFormDirty(false);
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  // Get first song from list for navigation after edit
  const getFirstSongId = useCallback(() => {
    if (!allCachedSongs || allCachedSongs.length === 0) {
      return null;
    }
    // Return first song ID (sorted by title)
    const sortedSongs = [...allCachedSongs].sort((a, b) => {
      // Sort by title alphabetically
      return a.title.localeCompare(b.title, 'pl', { sensitivity: 'base' });
    });
    return sortedSongs[0]?.id || null;
  }, [allCachedSongs]);

  const handleSubmit = async (data: UpdateSongDto) => {
    if (!id || updateSong.isPending) return;

    // Prevent empty update requests - only submit if form is dirty
    if (!isFormDirty) {
      console.log('Form is not dirty, skipping update request');
      return;
    }

    try {
      await updateSong.mutateAsync({ id, data });
      setIsFormDirty(false);
      showSuccess('Pieśń została zaktualizowana pomyślnie!');

      // Navigate to first song from list
      const firstSongId = getFirstSongId();
      if (firstSongId) {
        navigate(`/songs/${firstSongId}`);
      } else {
        // Fallback: navigate to home if no songs
        navigate('/');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Nie udało się zaktualizować pieśni. Spróbuj ponownie.';
      showError(errorMessage);
      console.error('Failed to update song:', error);
    }
  };

  // Show loading only if we don't have data and it's actually fetching
  if (!song && isFetching) {
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
            theme.palette.mode === 'dark' ? 'rgba(26, 35, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          zIndex: 9999,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !song) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Nie udało się załadować pieśni. Spróbuj ponownie.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        maxWidth: '1200px',
        mx: 'auto',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={2}
        flexWrap="wrap"
        gap={{ xs: 1.5, sm: 1 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => handleNavigation(`/songs/${id}`)}
          variant="outlined"
          size="small"
          sx={{
            borderColor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
            color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit'),
            '&:hover': {
              borderColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Wstecz
        </Button>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          sx={{
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-end', sm: 'flex-end' },
            gap: { xs: 1, sm: 1 },
            '& > *': {
              flex: { xs: '1 1 calc(50% - 4px)', sm: 'none' },
              minWidth: { xs: 'calc(50% - 4px)', sm: 'auto' },
              maxWidth: { xs: 'calc(50% - 4px)', sm: 'none' },
            },
          }}
        >
          <Button
            onClick={() => handleNavigation(`/songs/${id}`)}
            disabled={updateSong.isPending}
            size="small"
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
          {isFormDirty && (
            <Button
              variant="contained"
              form="song-form"
              type="submit"
              disabled={updateSong.isPending}
              size="small"
            >
              {updateSong.isPending ? 'Aktualizowanie...' : 'Aktualizuj'}
            </Button>
          )}
        </Stack>
      </Box>

      {updateSong.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się zaktualizować pieśni. Spróbuj ponownie.
        </Alert>
      )}

      <SongForm
        song={song}
        onSubmit={handleSubmit}
        onCancel={() => handleNavigation(`/songs/${id}`)}
        isLoading={updateSong.isPending}
        hideButtons={true}
        onDirtyChange={setIsFormDirty}
      />
    </Box>
  );
}
