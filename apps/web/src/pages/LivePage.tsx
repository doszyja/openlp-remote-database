import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Edit as EditIcon,
  MusicNote as MusicNoteIcon,
  WarningAmber as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useState, useEffect, useRef, useMemo } from 'react';
import { parseVerses } from '../utils/verseParser';
import { useActiveSong } from '../hooks/useServicePlans';
import { useActiveSongWs } from '../hooks/useActiveSongWs';

export default function LivePage() {
  const navigate = useNavigate();
  // WebSocket for low-latency updates; HTTP polling as graceful fallback
  const { data: wsData, isConnected: wsConnected } = useActiveSongWs();
  // HTTP fallback - wywołuj tylko gdy WebSocket nie jest połączony
  const { data: httpData, isLoading: httpLoading, error: httpError } = useActiveSong(!wsConnected);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [fontSizes, setFontSizes] = useState({ titleSize: 48, contentSize: 75 });
  const [dynamicContentSize, setDynamicContentSize] = useState(32);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSongData = wsConnected && wsData ? wsData : httpData;
  const isLoading = !wsConnected && httpLoading;
  const error = !wsConnected ? httpError : null;

  const song = activeSongData?.song ?? null;
  const servicePlan = activeSongData?.servicePlan ?? null;

  // Parse verses - ensure we handle null/undefined/empty strings
  const parsedVerses = useMemo(() => {
    if (!song) return [];
    const versesString = song.verses as string | Array<unknown> | undefined;

    // Debug: log what we're parsing
    if (versesString && typeof versesString === 'string' && versesString.trim()) {
      console.debug('Parsing verses:', {
        length: versesString.length,
        preview: versesString.substring(0, 100),
        hasXml: versesString.includes('<verse'),
      });
    } else {
      console.debug('No verses to parse:', { versesString, type: typeof versesString });
    }

    if (!versesString || typeof versesString !== 'string') {
      return [];
    }

    const parsed = parseVerses(
      versesString,
      song.verseOrder || null,
      (song as any).lyricsXml || null,
      (song as any).versesArray || null
    );
    const filtered = parsed.filter(v => v.content && v.content.trim());

    console.debug('Parsed verses:', {
      total: parsed.length,
      filtered: filtered.length,
      verseOrder: song.verseOrder,
      hasLyricsXml: !!(song as any).lyricsXml,
      verses: filtered.map(v => ({
        type: v.type,
        label: v.label,
        contentLength: v.content.length,
      })),
    });

    return filtered;
  }, [song?.verses, song?.verseOrder, (song as any)?.lyricsXml, song?.id]);

  // Helper function to determine if label should be displayed
  const shouldDisplayLabel = (label: string | null, type: string): boolean => {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.match(/^v\d+$/)) return false;
    if (lowerLabel.match(/^c\d+$/)) return false;
    if (type === 'chorus' || lowerLabel.includes('chorus') || lowerLabel.includes('refren'))
      return true;
    if (type === 'bridge' || lowerLabel.includes('bridge') || lowerLabel.includes('mostek'))
      return true;
    if (lowerLabel.includes('pre-chorus') || lowerLabel.includes('tag')) return true;
    return !lowerLabel.match(/^verse\s*\d+$/i);
  };

  // Generate step labels (V1, V2, C1, etc.) for each content item
  const generateStepLabel = (type: string | undefined, originalLabel: string | null): string => {
    const verseType = type || 'verse';
    const label = originalLabel || '';

    if (label) {
      const labelLower = label.toLowerCase();
      const match = labelLower.match(/([vcbpt])(\d+)/);
      if (match) {
        const prefix = match[1].toUpperCase();
        const number = match[2];
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
    const number = verseType === 'chorus' ? '1' : '1';
    return `${prefix}${number}`;
  };

  const allContent = useMemo(() => {
    if (!song) return [];
    return parsedVerses.map(v => {
      const label = v.label || null;
      const displayLabel = shouldDisplayLabel(label, v.type || 'verse') ? label : null;
      const finalLabel =
        displayLabel || (v.type === 'chorus' ? 'Refren' : v.type === 'bridge' ? 'Mostek' : null);
      const stepLabel = generateStepLabel(v.type || 'verse', v.label);
      return { type: v.type || 'verse', content: v.content, label: finalLabel, stepLabel };
    });
  }, [song, parsedVerses]);

  // Reset / sync verse index when active song or active verse changes
  useEffect(() => {
    if (!song || allContent.length === 0) {
      setCurrentVerseIndex(0);
      return;
    }
    const backendIndex = activeSongData?.item?.activeVerseIndex ?? 0;
    if (backendIndex >= 0 && backendIndex < allContent.length) {
      setCurrentVerseIndex(backendIndex);
    } else {
      setCurrentVerseIndex(0);
    }
  }, [song?.id, allContent.length, activeSongData?.item?.activeVerseIndex]);

  // Track fullscreen state (including when user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(!!fsElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as any);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as any);
    };
  }, []);

  // Calculate and update responsive font sizes
  useEffect(() => {
    const calculateFontSizes = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const isLandscape = vw > vh;
      const minDimension = Math.min(vh, vw);
      const primaryDimension = isLandscape ? vh : minDimension;
      const isMobile = vw < 600;
      const isTablet = vw >= 600 && vw < 1024;

      let titleSize = 48;
      let contentSize = 75;

      if (isMobile && isLandscape) {
        titleSize = Math.max(24, primaryDimension * 0.08);
        contentSize = Math.max(32, primaryDimension * 0.12);
      } else if (isMobile) {
        titleSize = Math.max(28, primaryDimension * 0.06);
        contentSize = Math.max(40, primaryDimension * 0.1);
      } else if (isTablet) {
        titleSize = Math.max(36, primaryDimension * 0.05);
        contentSize = Math.max(60, primaryDimension * 0.08);
      } else {
        titleSize = Math.max(48, primaryDimension * 0.04);
        contentSize = Math.max(75, primaryDimension * 0.06);
      }

      setFontSizes({ titleSize, contentSize });
    };

    calculateFontSizes();
    window.addEventListener('resize', calculateFontSizes);
    return () => window.removeEventListener('resize', calculateFontSizes);
  }, []);

  // Dynamic content size calculation
  useEffect(() => {
    if (!contentRef.current || allContent.length === 0) return;

    const updateContentSize = () => {
      const container = contentRef.current;
      if (!container) return;

      const containerHeight = container.clientHeight;
      const containerWidth = container.clientWidth;
      const content = allContent[currentVerseIndex]?.content || '';
      const lines = content.split('\n').filter(line => line.trim());
      const lineCount = lines.length;
      const maxLineLength = Math.max(...lines.map(line => line.length));

      if (lineCount === 0) return;

      const availableHeight = containerHeight * 0.9;
      const availableWidth = containerWidth * 0.95;
      const fontSizeByHeight = availableHeight / lineCount / 1.5;
      const fontSizeByWidth = (availableWidth / maxLineLength) * 1.8;
      const optimalSize = Math.min(fontSizeByHeight, fontSizeByWidth, fontSizes.contentSize * 1.5);
      const clampedSize = Math.max(24, Math.min(optimalSize, 120));

      setDynamicContentSize(clampedSize);
    };

    updateContentSize();
    const resizeObserver = new ResizeObserver(updateContentSize);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [currentVerseIndex, allContent, fontSizes.contentSize]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentVerseIndex > 0) {
          setCurrentVerseIndex(currentVerseIndex - 1);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (currentVerseIndex < allContent.length - 1) {
          setCurrentVerseIndex(currentVerseIndex + 1);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Esc: jeśli jesteśmy w fullscreen, tylko wyjdź z fullscreen;
        // jeśli nie, wyjdź z podstrony "Na żywo".
        if (isFullscreen) {
          try {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
              await (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
              await (document as any).msExitFullscreen();
            }
          } catch (err) {
            console.error('Error exiting fullscreen:', err);
          }
        } else {
          navigate('/');
        }
        return;
      }

      // Inne klawisze (np. F12, F5 itd.) pozostawiamy przeglądarce –
      // nie zmieniamy slajdu ani nie zmieniamy strony.
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentVerseIndex, allContent.length, navigate, isFullscreen]);

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

  const handleClose = () => {
    navigate('/');
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        const element = containerRef.current || document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !activeSongData || !song) {
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
          bgcolor: 'background.default',
          p: 4,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Brak aktywnej pieśni. Ustaw pieśń jako aktywną w planie nabożeństwa.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aby wyświetlić pieśń na żywo, musisz najpierw utworzyć plan nabożeństwa i ustawić pieśń
            jako aktywną.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <IconButton onClick={() => navigate('/service-plans')} color="primary">
              <Typography variant="body2">Przejdź do planów</Typography>
            </IconButton>
            <IconButton onClick={handleClose}>
              <FullscreenExitIcon />
            </IconButton>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const currentContent = allContent[currentVerseIndex];
  const displayTitle = song.number ? `${song.title} (${song.number})` : song.title;

  // If song exists but no content to display (no verses and no chorus)
  if (song && allContent.length === 0) {
    const hasVerses =
      song.verses &&
      (Array.isArray(song.verses)
        ? song.verses.length > 0
        : typeof song.verses === 'string' && (song.verses as string).trim().length > 0);

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
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
          p: { xs: 1, sm: 4 },
          overflow: 'auto',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 0,
            maxWidth: { xs: '100%', sm: 700 },
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Header with gradient background */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              p: { xs: 2, sm: 4 },
              position: 'relative',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1, sm: 2 },
                mb: { xs: 1.5, sm: 2 },
              }}
            >
              <MusicNoteIcon sx={{ fontSize: { xs: 32, sm: 48 }, opacity: 0.9 }} />
              <WarningIcon sx={{ fontSize: { xs: 32, sm: 48 }, opacity: 0.9 }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: { xs: 0.5, sm: 1 },
                letterSpacing: 0.5,
                fontSize: { xs: '1.25rem', sm: '2.125rem' },
                px: { xs: 1, sm: 0 },
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              Brak treści do wyświetlenia
            </Typography>
            <Typography
              variant="body1"
              sx={{
                opacity: 0.95,
                fontSize: { xs: '0.875rem', sm: '1.1rem' },
                px: { xs: 1, sm: 0 },
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {hasVerses
                ? 'Nie udało się sparsować treści pieśni'
                : 'Pieśń nie ma ustawionych zwrotek'}
            </Typography>
          </Box>

          {/* Content section */}
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mb: 3,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                }}
              >
                {displayTitle}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 4,
                lineHeight: 1.8,
                fontSize: '1rem',
              }}
            >
              {hasVerses
                ? 'Sprawdź format danych w bazie. Pieśń może mieć nieprawidłowy format XML lub tekstu.'
                : 'Aby wyświetlić pieśń na żywo, musisz dodać treść zwrotek. Kliknij przycisk poniżej, aby edytować pieśń.'}
            </Typography>

            {hasVerses && (
              <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{
                  mb: 3,
                  textAlign: 'left',
                  '& .MuiAlert-icon': {
                    fontSize: 28,
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  <strong>Informacje diagnostyczne:</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Pieśń ma pole <code>verses</code> (
                  {typeof song.verses === 'string' ? (song.verses as string).length : 'nie string'} znaków), ale
                  nie udało się sparsować treści.
                </Typography>
                {song.verses && typeof song.verses === 'string' && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '8px' }}>
                      Pokaż zawartość verses
                    </summary>
                    <Box
                      component="pre"
                      sx={{
                        mt: 1,
                        p: 2,
                        bgcolor: 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        maxHeight: '200px',
                        textAlign: 'left',
                        fontFamily: 'monospace',
                      }}
                    >
                      {(song.verses as string).substring(0, 500)}
                      {(song.verses as string).length > 500 && '...'}
                    </Box>
                  </details>
                )}
              </Alert>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/songs/${song.id}`)}
                size="large"
                sx={{
                  minWidth: { xs: '100%', sm: 200 },
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
              >
                Edytuj pieśń
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={handleClose}
                size="large"
                sx={{
                  minWidth: { xs: '100%', sm: 200 },
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Zamknij
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    );
  }

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
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: { xs: 2, sm: 4, md: 6 },
        overflow: 'hidden',
      }}
    >
      {/* Controls */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          position: 'absolute',
          top: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 16 },
          zIndex: 1000,
        }}
      >
        <IconButton onClick={handlePrevious} disabled={currentVerseIndex === 0} color="inherit">
          <NavigateBeforeIcon />
        </IconButton>
        <IconButton
          onClick={handleNext}
          disabled={currentVerseIndex >= allContent.length - 1}
          color="inherit"
        >
          <NavigateNextIcon />
        </IconButton>
        <IconButton onClick={handleToggleFullscreen} color="inherit">
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
      </Stack>

      {/* Service Plan Info */}
      {servicePlan && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 16 },
            left: { xs: 8, sm: 16 },
            zIndex: 1000,
            opacity: 0.7,
          }}
        >
          {servicePlan.name}
        </Typography>
      )}

      {/* Step Indicator */}
      {allContent.length > 0 && (
        <Typography
          variant="h6"
          sx={{
            position: 'absolute',
            bottom: { xs: 60, sm: 80 },
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.5,
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}
        >
          {currentContent.stepLabel} ({currentVerseIndex + 1}/{allContent.length})
        </Typography>
      )}

      {/* Song Title - Bottom Left */}
      <Typography
        variant="h6"
        component="h1"
        sx={{
          position: 'absolute',
          bottom: { xs: 8, sm: 16 },
          left: { xs: 8, sm: 16 },
          zIndex: 1000,
          opacity: 0.7,
          fontSize: { xs: '0.875rem', sm: '1rem', md: '1.1rem' },
          fontWeight: 600,
          wordBreak: 'break-word',
          maxWidth: { xs: '60%', sm: '50%' },
        }}
      >
        {displayTitle}
      </Typography>

      {/* Content */}
      <Box
        ref={contentRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          textAlign: 'center',
        }}
      >
        {currentContent && (
          <Typography
            variant="body1"
            component="div"
            sx={{
              fontSize: `${dynamicContentSize}px`,
              lineHeight: 1.4,
              whiteSpace: 'pre-line',
              px: { xs: 2, sm: 4 },
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {currentContent.content}
          </Typography>
        )}

        {currentContent?.label && (
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              opacity: 0.7,
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            {currentContent.label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
