import { useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Box, Alert, CircularProgress, Button, Stack } from '@mui/material';
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
    if (!id) return;

    try {
      await updateSong.mutateAsync({ id, data });
      showSuccess('Song updated successfully!');
      navigate(`/songs/${id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update song. Please try again.';
      showError(errorMessage);
      console.error('Failed to update song:', error);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !song) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load song. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to List
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => navigate(`/songs/${id}`)}
            disabled={updateSong.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            form="song-form"
            type="submit"
            disabled={updateSong.isPending}
          >
            {updateSong.isPending ? 'Updating...' : 'Update Song'}
          </Button>
        </Stack>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Edit Song
      </Typography>

      {updateSong.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to update song. Please try again.
        </Alert>
      )}

      <SongForm
        song={song}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/songs/${id}`)}
        isLoading={updateSong.isPending}
        hideButtons={true}
      />
    </Container>
  );
}

