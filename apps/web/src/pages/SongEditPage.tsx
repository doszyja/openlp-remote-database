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
  const { data: song, isLoading, error } = useSong(id!);
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

  if (isLoading) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress />
        </Box>
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
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 }, maxWidth: '1200px', mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/songs')}
          variant="outlined"
          size="small"
          sx={{
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
            color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit',
            '&:hover': {
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Wstecz
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => navigate(`/songs/${id}`)}
            disabled={updateSong.isPending}
            size="small"
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
            {updateSong.isPending ? 'Aktualizowanie...' : 'Aktualizuj Pieśń'}
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

