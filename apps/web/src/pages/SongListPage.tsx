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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
} from '@mui/material';
import { Add as AddIcon, MusicNote as MusicNoteIcon } from '@mui/icons-material';
import { useSongs } from '../hooks/useSongs';
import type { SongQueryDto } from '@openlp/shared';

export default function SongListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<SongQueryDto>({
    page: 1,
    limit: 150, // Display up to 150 songs
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
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1">
          Songs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/songs/new')}
          size="small"
        >
          Add Song
        </Button>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="body2" sx={{ minWidth: 60 }}>
          Search:
        </Typography>
        <TextField
          fullWidth
          placeholder="Search Entire Song..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MusicNoteIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => handleSearch(search)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {data?.data.length === 0 ? (
        <Alert severity="info">No songs found. Create your first song!</Alert>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto',
          }}
        >
          <List dense>
            {data?.data.map((song) => {
              // Format song title with author if available
              const displayTitle = song.number
                ? `${song.title} (${song.number})`
                : song.title;
              
              return (
                <ListItem
                  key={song.id}
                  disablePadding
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemButton onClick={() => navigate(`/songs/${song.id}`)}>
                    <ListItemText
                      primary={displayTitle}
                      primaryTypographyProps={{
                        variant: 'body1',
                        sx: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}
    </Container>
  );
}

