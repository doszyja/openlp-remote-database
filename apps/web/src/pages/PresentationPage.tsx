import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Stack, CircularProgress, Alert } from '@mui/material';
import {
  FullscreenExit as FullscreenExitIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { useSong } from '../hooks';
import { useSongViewTelemetry } from '../hooks/useSongViewTelemetry';
import { parseVerses } from '../utils/verseParser';
import { useTheme } from '@mui/material/styles';
import OpenLpSlideDisplay from '../components/OpenLpSlideDisplay';

// Fullscreen API vendor prefixes
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface ElementWithFullscreen extends Element {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { data: song, isLoading, error } = useSong(id!);
  useSongViewTelemetry(id, song?.title, 'presentation');
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse verses
  const parsedVerses = song
    ? parseVerses(
        song.verses as unknown as string,
        song.verseOrder || null,
        song.lyricsXml || null,
        song.versesArray || null
      ).filter(v => v.content && v.content.trim())
    : [];

  // Helper function to determine if label should be displayed
  const shouldDisplayLabel = (label: string | null, type: string): boolean => {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();
    // Don't show labels like "v1", "v2", "v3", "c1", "c2", etc.
    if (lowerLabel.match(/^v\d+$/)) return false;
    if (lowerLabel.match(/^c\d+$/)) return false;
    // Show meaningful labels like "Refren", "Bridge", "Chorus", etc.
    if (type === 'chorus' || lowerLabel.includes('chorus') || lowerLabel.includes('refren'))
      return true;
    if (type === 'bridge' || lowerLabel.includes('bridge') || lowerLabel.includes('mostek'))
      return true;
    if (lowerLabel.includes('pre-chorus') || lowerLabel.includes('tag')) return true;
    // Show other meaningful labels (not just verse numbers)
    return !lowerLabel.match(/^verse\s*\d+$/i);
  };

  // Generate step labels (V1, V2, C1, etc.) for each content item
  const generateStepLabel = (type: string | undefined, originalLabel: string | null): string => {
    const verseType = type || 'verse';
    const label = originalLabel || '';

    // If we have a label, try to extract the step label from it (e.g., "v1" -> "V1", "c1" -> "C1")
    if (label) {
      const labelLower = label.toLowerCase();
      // Check for patterns like "v1", "c1", "v2", etc.
      const match = labelLower.match(/([vcbpt])(\d+)/);
      if (match) {
        const prefix = match[1].toUpperCase();
        const number = match[2];
        // Map prefix to display format
        const displayPrefix =
          prefix === 'C'
            ? 'C'
            : prefix === 'B'
              ? 'B'
              : prefix === 'P'
                ? 'P'
                : prefix === 'T'
                  ? 'T'
                  : 'V';
        return `${displayPrefix}${number}`;
      }
      // Try to extract just the number and use type prefix
      const numMatch = labelLower.match(/\d+/);
      if (numMatch) {
        const prefix =
          verseType === 'chorus'
            ? 'C'
            : verseType === 'bridge'
              ? 'B'
              : verseType === 'pre-chorus'
                ? 'P'
                : verseType === 'tag'
                  ? 'T'
                  : 'V';
        return `${prefix}${numMatch[0]}`;
      }
    }

    // If no label or number found, generate based on type
    // For chorus, default to C1, for others use type prefix + 1
    const prefix =
      verseType === 'chorus'
        ? 'C'
        : verseType === 'bridge'
          ? 'B'
          : verseType === 'pre-chorus'
            ? 'P'
            : verseType === 'tag'
              ? 'T'
              : 'V';
    const number = verseType === 'chorus' ? '1' : '1'; // Default to 1 if no label
    return `${prefix}${number}`;
  };

  const allContent = parsedVerses.map(v => {
    const label = v.label || null;
    const displayLabel = shouldDisplayLabel(label, v.type || 'verse') ? label : null;
    // Use type-based label if original label shouldn't be displayed
    const finalLabel =
      displayLabel || (v.type === 'chorus' ? 'Refren' : v.type === 'bridge' ? 'Mostek' : null);
    const stepLabel = generateStepLabel(v.type || 'verse', v.label);
    return { type: v.type || 'verse', content: v.content, label: finalLabel, stepLabel };
  });

  // Reset verse index when song changes
  useEffect(() => {
    setCurrentVerseIndex(0);
  }, [id]);

  // Handle fullscreen
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (containerRef.current) {
          const element = containerRef.current as ElementWithFullscreen;
          if (element.requestFullscreen) {
            await element.requestFullscreen();
          } else if (element.webkitRequestFullscreen) {
            await element.webkitRequestFullscreen();
          } else if (element.mozRequestFullScreen) {
            await element.mozRequestFullScreen();
          } else if (element.msRequestFullscreen) {
            await element.msRequestFullscreen();
          }
        }
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        // Exit presentation mode if fullscreen is exited
        navigate(`/songs/${id}`);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [id, navigate]);

  // Handle click to advance slide
  const handleClick = async () => {
    if (currentVerseIndex >= allContent.length - 1) {
      // On last slide, close presentation
      try {
        const doc = document as DocumentWithFullscreen;
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
      navigate(`/songs/${id}`);
    } else {
      // Not on last slide, go to next
      setCurrentVerseIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation - any key advances to next slide, or closes if on last slide
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      // Ignore modifier keys (Shift, Ctrl, Alt, Meta) alone
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // Escape always closes presentation
      if (e.key === 'Escape') {
        try {
          const doc = document as DocumentWithFullscreen;
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        } catch (err) {
          console.error('Error exiting fullscreen:', err);
        }
        navigate(`/songs/${id}`);
        return;
      }

      // Arrow left/up goes to previous slide
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentVerseIndex(prev => Math.max(0, prev - 1));
        return;
      }

      // Any other key: if on last slide, close presentation; otherwise go to next slide
      if (currentVerseIndex >= allContent.length - 1) {
        // On last slide, close presentation
        try {
          const doc = document as DocumentWithFullscreen;
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        } catch (err) {
          console.error('Error exiting fullscreen:', err);
        }
        navigate(`/songs/${id}`);
      } else {
        // Not on last slide, go to next
        setCurrentVerseIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentVerseIndex, allContent.length, id, navigate]);

  const handleNext = () => {
    if (currentVerseIndex < allContent.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  const handleExit = async () => {
    try {
      const doc = document as DocumentWithFullscreen;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.error('Error exiting fullscreen:', err);
    }
    navigate(`/songs/${id}`);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#000000',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !song) {
    return (
      <Box
        sx={{
          position: 'fixed',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#000000',
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          Nie udało się załadować pieśni.
        </Alert>
      </Box>
    );
  }

  const currentContent = allContent[currentVerseIndex] || allContent[0];

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10000,
      }}
    >
      {/* Header with controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: { xs: 1, sm: 1.5, md: 2 },
          zIndex: 10001,
          bgcolor: 'transparent',
          opacity: 0,
          transition: 'opacity 0.3s',
          '&:hover': {
            opacity: 1,
          },
        }}
      >
        <IconButton
          onClick={e => {
            e.stopPropagation();
            handleExit();
          }}
          size={window.innerWidth < 600 ? 'small' : 'medium'}
          sx={{
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            bgcolor:
              theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              bgcolor:
                theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.95)',
            },
          }}
        >
          <FullscreenExitIcon />
        </IconButton>
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
          <IconButton
            onClick={e => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={currentVerseIndex === 0}
            size={window.innerWidth < 600 ? 'small' : 'medium'}
            sx={{
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              bgcolor:
                theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(255, 255, 255, 0.95)',
              },
              '&:disabled': {
                opacity: 0.3,
              },
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentVerseIndex === allContent.length - 1}
            size={window.innerWidth < 600 ? 'small' : 'medium'}
            sx={{
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              bgcolor:
                theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(255, 255, 255, 0.95)',
              },
              '&:disabled': {
                opacity: 0.3,
              },
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Main content — OpenLP theme layout */}
      <Box
        onClick={handleClick}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: 0,
          cursor: 'pointer',
        }}
      >
        <OpenLpSlideDisplay
          fillParent
          aspectRatio={null}
          slideText={currentContent.content}
          footerText={
            song.number ? `${song.title} (${song.number})` : song.title
          }
        />
      </Box>

      {/* Presentation chrome (not part of OpenLP output) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          p: { xs: 1, sm: 1.5, md: 2 },
          zIndex: 10001,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ width: '33%' }} />

        {/* Navigation info - center */}
        <Typography
          variant="body2"
          sx={{
            color:
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
            bgcolor:
              theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            px: { xs: 1, sm: 1.5, md: 2 },
            py: { xs: '0.5', sm: 0.75, md: 1 },
            borderRadius: 1,
            opacity: 0,
            transition: 'opacity 0.3s',
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          {currentVerseIndex + 1} / {allContent.length}
        </Typography>

        {/* Step labels - bottom right */}
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 0.75, md: 1 },
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            maxWidth: { xs: '50%', sm: '45%', md: '40%' },
          }}
        >
          {allContent.map((item, idx) => (
            <Typography
              key={idx}
              variant="body2"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.8rem' },
                fontWeight: idx === currentVerseIndex ? 600 : 400,
                color:
                  theme.palette.mode === 'dark'
                    ? idx === currentVerseIndex
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.5)'
                    : idx === currentVerseIndex
                      ? 'rgba(0, 0, 0, 0.9)'
                      : 'rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s',
              }}
            >
              {item.stepLabel}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
