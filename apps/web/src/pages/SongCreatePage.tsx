import { useNavigate } from 'react-router-dom';
import { Container, Typography, Alert } from '@mui/material';
import { useCreateSong } from '../hooks/useCreateSong';
import SongForm from '../components/SongForm';
import type { CreateSongDto, UpdateSongDto } from '@openlp/shared';

export default function SongCreatePage() {
  const navigate = useNavigate();
  const createSong = useCreateSong();

  const handleSubmit = async (data: CreateSongDto | UpdateSongDto) => {
    try {
      const result = await createSong.mutateAsync(data as CreateSongDto);
      navigate(`/songs/${result.id}`);
    } catch (error) {
      // Error is handled by React Query
      console.error('Failed to create song:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Song
      </Typography>

      {createSong.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to create song. Please try again.
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

