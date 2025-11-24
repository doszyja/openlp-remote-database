import { useNavigate } from 'react-router-dom';
import { Container, Typography, Alert } from '@mui/material';
import { useCreateSong } from '../hooks/useCreateSong';
import SongForm from '../components/SongForm';
import { useNotification } from '../contexts/NotificationContext';
import type { CreateSongDto, UpdateSongDto } from '@openlp/shared';

export default function SongCreatePage() {
  const navigate = useNavigate();
  const createSong = useCreateSong();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (data: CreateSongDto | UpdateSongDto) => {
    // Prevent double submission
    if (createSong.isPending) {
      return;
    }

    try {
      const result = await createSong.mutateAsync(data as CreateSongDto);
      showSuccess('Pieśń została utworzona pomyślnie!');
      navigate(`/songs/${result.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się utworzyć pieśni. Spróbuj ponownie.';
      showError(errorMessage);
      console.error('Failed to create song:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Utwórz Nową Pieśń
      </Typography>

      {createSong.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Nie udało się utworzyć pieśni. Spróbuj ponownie.
        </Alert>
      )}

      <SongForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
        isLoading={createSong.isPending}
      />
    </Container>
  );
}

