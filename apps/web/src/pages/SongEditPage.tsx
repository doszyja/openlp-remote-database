import { useNavigate, useParams } from 'react-router-dom';
import { Box, Alert, CircularProgress, Button, Stack } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useSong, useUpdateSong } from '../hooks';
import SongForm from '../components/SongForm';
import { useNotification } from '../contexts/NotificationContext';
import type { UpdateSongDto } from '@openlp/shared';

export default function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isFetching, error } = useSong(id!);
  const updateSong = useUpdateSong();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (data: UpdateSongDto) => {
    if (!id || updateSong.isPending) return;

    try {
      await updateSong.mutateAsync({ id, data });
      showSuccess('Pieśń została zaktualizowana pomyślnie!');
      navigate(`/songs/${id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się zaktualizować pieśni. Spróbuj ponownie.';
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
          backgroundColor: (theme) => 
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

  if (error || !song) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Nie udało się załadować pieśni. Spróbuj ponownie.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      px: { xs: 2, sm: 3, md: 4 }, 
      py: { xs: 2, sm: 3 }, 
      maxWidth: '1200px', 
      mx: 'auto',
      width: '100%',
      overflowX: 'hidden',
    }}>
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
          onClick={() => navigate(`/songs/${id}`)}
          variant="outlined"
          size="small"
          sx={{
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
            color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit',
            '&:hover': {
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
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
            onClick={() => navigate(`/songs/${id}`)}
            disabled={updateSong.isPending}
            size="small"
            variant="outlined"
            sx={{
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
              color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : undefined,
              '&:hover': {
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
              },
            }}
          >
            Anuluj
          </Button>
          <Button
            variant="contained"
            form="song-form"
            type="submit"
            disabled={updateSong.isPending}
            size="small"
          >
            {updateSong.isPending ? 'Aktualizowanie...' : 'Aktualizuj'}
          </Button>
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
        onCancel={() => navigate(`/songs/${id}`)}
        isLoading={updateSong.isPending}
        hideButtons={true}
      />
    </Box>
  );
}

