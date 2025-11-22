import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  LibraryMusic as LibraryMusicIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box textAlign="center" mb={6}>
        <Typography 
          variant="h2" 
          component="h1" 
          gutterBottom
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 2,
          }}
        >
          OpenLP Song Database
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Manage and sync your songs with OpenLP
        </Typography>
      </Box>

      <Stack spacing={3} sx={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <LibraryMusicIcon color="primary" sx={{ fontSize: 28 }} />
              <Box flex={1}>
                <Typography variant="h5" component="h2" fontWeight={500} gutterBottom>
                  Browse Songs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and search through all your songs
                </Typography>
              </Box>
            </Box>
          </CardContent>
          <CardActions sx={{ px: 3, pb: 3 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => navigate('/songs')}
              fullWidth
            >
              Go to Songs
            </Button>
          </CardActions>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <AddIcon color="primary" sx={{ fontSize: 28 }} />
              <Box flex={1}>
                <Typography variant="h5" component="h2" fontWeight={500} gutterBottom>
                  Create New Song
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add a new song to your collection
                </Typography>
              </Box>
            </Box>
          </CardContent>
          <CardActions sx={{ px: 3, pb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/songs/new')}
              fullWidth
            >
              Create Song
            </Button>
          </CardActions>
        </Card>
      </Stack>
    </Container>
  );
}

