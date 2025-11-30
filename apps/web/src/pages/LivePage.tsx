import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Stack, Paper, CircularProgress, Alert } from '@mui/material';
import { FullscreenExit as FullscreenExitIcon, NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useState, useEffect, useRef, useMemo } from 'react';
import { parseVerses } from '../utils/verseParser';
import { useActiveSong } from '../hooks/useServicePlans';

export default function LivePage() {
  const navigate = useNavigate();
  const { data: activeSongData, isLoading, error } = useActiveSong();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [fontSizes, setFontSizes] = useState({ titleSize: 48, contentSize: 75 });
  const [dynamicContentSize, setDynamicContentSize] = useState(32);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const song = activeSongData?.song;
  const servicePlan = activeSongData?.servicePlan;

  // Parse verses
  const parsedVerses = song ? parseVerses(song.verses).filter(v => v.content && v.content.trim()) : [];
  
  // Helper function to determine if label should be displayed
  const shouldDisplayLabel = (label: string | null, type: string): boolean => {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.match(/^v\d+$/)) return false;
    if (lowerLabel.match(/^c\d+$/)) return false;
    if (type === 'chorus' || lowerLabel.includes('chorus') || lowerLabel.includes('refren')) return true;
    if (type === 'bridge' || lowerLabel.includes('bridge') || lowerLabel.includes('mostek')) return true;
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
        const displayPrefix = prefix === 'C' ? 'C' : prefix === 'B' ? 'B' : prefix === 'P' ? 'P' : prefix === 'T' ? 'T' : 'V';
        return `${displayPrefix}${number}`;
      }
      const numMatch = labelLower.match(/\d+/);
      if (numMatch) {
        const prefix = verseType === 'chorus' ? 'C' : verseType === 'bridge' ? 'B' : verseType === 'pre-chorus' ? 'P' : verseType === 'tag' ? 'T' : 'V';
        return `${prefix}${numMatch[0]}`;
      }
    }
    
    const prefix = verseType === 'chorus' ? 'C' : verseType === 'bridge' ? 'B' : verseType === 'pre-chorus' ? 'P' : verseType === 'tag' ? 'T' : 'V';
    const number = verseType === 'chorus' ? '1' : '1';
    return `${prefix}${number}`;
  };

  const allContent = useMemo(() => {
    if (!song) return [];
    return [
      ...(song.chorus ? [{ type: 'chorus', content: song.chorus, label: 'Refren', stepLabel: 'C1' }] : []),
      ...parsedVerses.map((v) => {
        const label = v.label || null;
        const displayLabel = shouldDisplayLabel(label, v.type || 'verse') ? label : null;
        const finalLabel = displayLabel || (v.type === 'chorus' ? 'Refren' : v.type === 'bridge' ? 'Mostek' : null);
        const stepLabel = generateStepLabel(v.type || 'verse', v.label);
        return { type: v.type || 'verse', content: v.content, label: finalLabel, stepLabel };
      })
    ];
  }, [song, parsedVerses]);

  // Reset verse index when song changes
  useEffect(() => {
    setCurrentVerseIndex(0);
  }, [song?.id]);

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
        navigate('/');
        return;
      }

      if (currentVerseIndex >= allContent.length - 1) {
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
        navigate('/');
      } else {
        setCurrentVerseIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentVerseIndex, allContent.length, navigate]);

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
    navigate('/');
  };

  // Auto-enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    };

    enterFullscreen();
  }, []);

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
            Aby wyświetlić pieśń na żywo, musisz najpierw utworzyć plan nabożeństwa i ustawić pieśń jako aktywną.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <IconButton onClick={() => navigate('/service-plans')} color="primary">
              <Typography variant="body2">Przejdź do planów</Typography>
            </IconButton>
            <IconButton onClick={handleExit}>
              <FullscreenExitIcon />
            </IconButton>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const currentContent = allContent[currentVerseIndex];
  const displayTitle = song.number ? `${song.title} (${song.number})` : song.title;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
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
        <IconButton onClick={handleNext} disabled={currentVerseIndex >= allContent.length - 1} color="inherit">
          <NavigateNextIcon />
        </IconButton>
        <IconButton onClick={handleExit} color="inherit">
          <FullscreenExitIcon />
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
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontSize: { xs: `${fontSizes.titleSize * 0.7}px`, sm: `${fontSizes.titleSize}px` },
            fontWeight: 600,
            mb: { xs: 2, sm: 4 },
            px: 2,
            wordBreak: 'break-word',
          }}
        >
          {displayTitle}
        </Typography>

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

