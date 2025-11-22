import { useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { useSong, useUpdateSong } from '../hooks';
import SongForm from '../components/SongForm';
import type { UpdateSongDto } from '@openlp/shared';

export default function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading, error } = useSong(id!);
  const updateSong = useUpdateSong();

  const handleSubmit = async (data: UpdateSongDto) => {
    if (!id) return;

    try {
      await updateSong.mutateAsync({ id, data });
      navigate(`/songs/${id}`);
    } catch (error) {
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
      />
    </Container>
  );
}

