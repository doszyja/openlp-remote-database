import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useSongs } from '../hooks/useSongs';
import type { SongQueryDto } from '@openlp/shared';

export default function SongListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<SongQueryDto>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useSongs(query);

  const handleSearch = (value: string) => {
    setSearch(value);
    setQuery((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load songs. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Songs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/songs/new')}
        >
          Add Song
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search songs..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {data?.data.length === 0 ? (
        <Alert severity="info">No songs found. Create your first song!</Alert>
      ) : (
        <Grid container spacing={2}>
          {data?.data.map((song) => (
            <Grid item xs={12} sm={6} md={4} key={song.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {song.title}
                  </Typography>
                  {song.number && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      #{song.number}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                    <Chip label={song.language} size="small" />
                    {song.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {song.verses.length} verse{song.verses.length !== 1 ? 's' : ''}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/songs/${song.id}`)}>
                    View
                  </Button>
                  <Button size="small" onClick={() => navigate(`/songs/${song.id}/edit`)}>
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

