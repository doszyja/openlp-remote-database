import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Slideshow as SlideshowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OpenLpSlideDisplay from './OpenLpSlideDisplay';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { songsCache } from '../services/songs-cache';
import { parseVerses, getVerseDisplayLabel } from '../utils/verseParser';

interface SongOpenLpPreviewProps {
  songId: string;
  showPresentationLink?: boolean;
}

export default function SongOpenLpPreview({
  songId,
  showPresentationLink = true,
}: SongOpenLpPreviewProps) {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const { songs: allCachedSongs, isLoading: isCacheLoading } = useCachedSongs();

  const song = useMemo(() => {
    if (!songId) return null;
    return songsCache.getSongById(songId);
  }, [songId, allCachedSongs]);

  const slides = useMemo(() => {
    if (!song) return [];
    return parseVerses(
      song.verses,
      song.verseOrder || null,
      song.lyricsXml || null,
      song.versesArray || null
    ).filter(v => v.content && v.content.trim());
  }, [song]);

  useEffect(() => {
    setSlideIndex(0);
  }, [songId]);

  if (isCacheLoading && !song) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!song) {
    return <Alert severity="info">Nie znaleziono pieśni.</Alert>;
  }

  if (slides.length === 0) {
    return <Alert severity="info">Brak treści do podglądu slajdów.</Alert>;
  }

  const footerText = song.number ? `${song.title} (${song.number})` : song.title;
  const current = slides[slideIndex];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {song.title}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            size="small"
            disabled={slideIndex <= 0}
            onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
            aria-label="Poprzedni slajd"
          >
            <NavigateBeforeIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {getVerseDisplayLabel(current, slideIndex)} ({slideIndex + 1}/{slides.length})
          </Typography>
          <IconButton
            size="small"
            disabled={slideIndex >= slides.length - 1}
            onClick={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))}
            aria-label="Następny slajd"
          >
            <NavigateNextIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: 1000,
          mx: 'auto',
        }}
      >
        <OpenLpSlideDisplay slideText={current?.content ?? ''} footerText={footerText} />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Render według osadzonego motywu OpenLP (1024×768). Tagi &#123;st&#125;, &#123;br&#125; itd. jak na
        ekranie projektora.
      </Typography>

      {showPresentationLink && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<SlideshowIcon />}
          onClick={() => navigate(`/songs/${songId}/presentation`)}
          sx={{ mt: 2 }}
        >
          Tryb prezentacji (pełny ekran)
        </Button>
      )}
    </Paper>
  );
}