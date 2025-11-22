import { useNavigate, useParams } from 'react-router-dom';
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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useSong, useDeleteSong } from '../hooks';

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading, error } = useSong(id!);
  const deleteSong = useDeleteSong();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteSong.mutateAsync(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete song:', error);
    } finally {
      setDeleteDialogOpen(false);
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
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/songs/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {song.title}
        </Typography>

        {song.number && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            #{song.number}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2 }}>
          <Chip label={song.language} />
          {song.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} variant="outlined" />
          ))}
        </Stack>
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

      <Box>
        <Typography variant="h6" gutterBottom>
          Verses
        </Typography>
        <Stack spacing={2}>
          {song.verses.map((verse) => (
            <Paper key={verse.id} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {verse.label || `Verse ${verse.order}`}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {verse.content}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Song?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{song.title}"? This action cannot be undone.
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

