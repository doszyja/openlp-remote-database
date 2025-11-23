import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Stack, Paper, CircularProgress, Alert } from '@mui/material';
import { FullscreenExit as FullscreenExitIcon, NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { useSong } from '../hooks';
import { parseVerses } from '../utils/verseParser';
import { useTheme } from '@mui/material/styles';

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { data: song, isLoading, error } = useSong(id!);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSizes, setFontSizes] = useState({ titleSize: 48, contentSize: 75 });
  const [dynamicContentSize, setDynamicContentSize] = useState(32);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse verses
  const parsedVerses = song ? parseVerses(song.verses).filter(v => v.content && v.content.trim()) : [];
  
  // Helper function to determine if label should be displayed
  const shouldDisplayLabel = (label: string | null, type: string): boolean => {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();
    // Don't show labels like "v1", "v2", "v3", "c1", "c2", etc.
    if (lowerLabel.match(/^v\d+$/)) return false;
    if (lowerLabel.match(/^c\d+$/)) return false;
    // Show meaningful labels like "Refren", "Bridge", "Chorus", etc.
    if (type === 'chorus' || lowerLabel.includes('chorus') || lowerLabel.includes('refren')) return true;
    if (type === 'bridge' || lowerLabel.includes('bridge') || lowerLabel.includes('mostek')) return true;
    if (lowerLabel.includes('pre-chorus') || lowerLabel.includes('tag')) return true;
    // Show other meaningful labels (not just verse numbers)
    return !lowerLabel.match(/^verse\s*\d+$/i);
  };
  
  const allContent = [
    ...(song?.chorus ? [{ type: 'chorus', content: song.chorus, label: 'Refren' }] : []),
    ...parsedVerses.map(v => {
      const label = v.label || null;
      const displayLabel = shouldDisplayLabel(label, v.type || 'verse') ? label : null;
      // Use type-based label if original label shouldn't be displayed
      const finalLabel = displayLabel || (v.type === 'chorus' ? 'Refren' : v.type === 'bridge' ? 'Mostek' : null);
      return { type: v.type || 'verse', content: v.content, label: finalLabel };
    })
  ];

  // Reset verse index when song changes
  useEffect(() => {
    setCurrentVerseIndex(0);
  }, [id]);

  // Calculate and update responsive font sizes
  useEffect(() => {
    const calculateFontSizes = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const minDimension = Math.min(vh, vw);
      
      // Base font size scales with viewport
      // For title: 4-8% of smaller dimension, clamped between 32-80px
      // For content: 4-8% of smaller dimension, clamped between 32-96px (much larger for lyrics)
      const titleSize = Math.min(Math.max(minDimension * 0.05, 60), 80);
      const contentSize = Math.min(Math.max(minDimension * 0.06, 60), 96);
      
      setFontSizes({ titleSize, contentSize });
    };

    calculateFontSizes();
    window.addEventListener('resize', calculateFontSizes);
    return () => window.removeEventListener('resize', calculateFontSizes);
  }, []);

  // Calculate dynamic font size based on content and available space
  // Recalculate every time slide changes
  useEffect(() => {
    const calculateDynamicSize = () => {
      if (!contentRef.current || allContent.length === 0) return;

      const currentContentItem = allContent[currentVerseIndex] || allContent[0];
      if (!currentContentItem) return;

      const container = contentRef.current.parentElement?.parentElement;
      if (!container) return;

      // Get available space (subtract padding and title space)
      const containerHeight = container.clientHeight;
      const containerWidth = container.clientWidth;
      const padding = 120; // Increased padding to account for title at bottom
      const availableHeight = Math.max(containerHeight - padding, containerHeight * 0.8);
      const availableWidth = Math.max(containerWidth - padding, containerWidth * 0.9);

      // Count lines in content
      const lines = currentContentItem.content.split('\n').filter(line => line.trim().length > 0);
      const lineCount = lines.length || 1;
      
      // Find longest line for width calculation
      const longestLine = lines.reduce((longest, line) => 
        line.length > longest.length ? line : longest, 
        lines[0] || ''
      );

      // Calculate font size based on height (line count)
      // Use line-height of 1.4, but be more aggressive with space usage
      const lineHeight = 1.4;
      // Use 95% of available height divided by line count for larger text
      const heightBasedSize = (availableHeight * 0.95 / lineCount) / lineHeight;
      
      // Calculate font size based on width (longest line)
      // Average character width for most fonts is approximately 0.5-0.6 * font size
      // Be more generous - use 95% of available width and more accurate char width
      // For larger screens, we can be more aggressive
      const avgCharWidth = 0.6; // More generous for larger text
      const widthBasedSize = (availableWidth * 0.95 / longestLine.length) / avgCharWidth;

      // Use the smaller of the two to ensure text fits
      const optimalSize = Math.min(heightBasedSize, widthBasedSize);
      
      // Clamp between reasonable min and max (increased max to 150px for large screens)
      const clampedSize = Math.max(60, Math.min(optimalSize, 90));
      
      // Only update if size actually changed to prevent infinite loops
      setDynamicContentSize(prevSize => {
        // Only update if difference is significant (more than 1px)
        if (Math.abs(prevSize - clampedSize) > 1) {
          return clampedSize;
        }
        return prevSize;
      });
    };

    // Calculate after a delay to ensure DOM is updated with new content
    const timer1 = setTimeout(calculateDynamicSize, 50);
    // Also recalculate after a longer delay to ensure layout is stable
    const timer2 = setTimeout(calculateDynamicSize, 200);
    
    // Recalculate on resize (with debounce to prevent too many calls)
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(calculateDynamicSize, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [allContent.length, currentVerseIndex]);

  // Handle fullscreen
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if ((containerRef.current as any).mozRequestFullScreen) {
            await (containerRef.current as any).mozRequestFullScreen();
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen();
          }
          setIsFullscreen(true);
        }
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      
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
    navigate(`/songs/${id}`);
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
          bgcolor: theme.palette.mode === 'dark' ? '#1a232e' : '#ffffff',
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: theme.palette.mode === 'dark' ? '#1a232e' : '#ffffff',
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: theme.palette.mode === 'dark' ? '#1a232e' : '#ffffff',
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
          p: 2,
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
          onClick={(e) => {
            e.stopPropagation();
            handleExit();
          }}
          sx={{
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.95)',
            },
          }}
        >
          <FullscreenExitIcon />
        </IconButton>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={currentVerseIndex === 0}
            sx={{
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.95)',
              },
              '&:disabled': {
                opacity: 0.3,
              },
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentVerseIndex === allContent.length - 1}
            sx={{
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.95)',
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

      {/* Main content */}
      <Box
        onClick={handleClick}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%',
          px: { xs: 4, sm: 6, md: 8, lg: 10 },
          py: { xs: 8, sm: 10, md: 12 },
          overflow: 'auto',
          cursor: 'pointer',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: '100%',
            p: { xs: 4, sm: 6, md: 8 },
            bgcolor: 'transparent',
            textAlign: 'center',
          }}
        >
          {/* Verse/Chorus label */}
          {currentContent.label && (
            <Typography
              variant="h6"
              sx={{
                fontSize: `${fontSizes.contentSize * 0.5}px`,
                fontWeight: 500,
                mb: { xs: 2, sm: 3, md: 4 },
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {currentContent.label}
            </Typography>
          )}

          {/* Verse/Chorus content - dynamically sized and lighter weight */}
          <Typography
            ref={contentRef}
            variant="body1"
            sx={{
              fontSize: `${dynamicContentSize}px`,
              fontWeight: 400,
              lineHeight: 1.4,
              whiteSpace: 'pre-line',
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {currentContent.content}
          </Typography>
        </Paper>
      </Box>

      {/* Footer with song title (bottom left) and navigation info (center) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          p: 2,
          zIndex: 10001,
        }}
      >
        {/* Song title - bottom left, smaller */}
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontSize: `${fontSizes.titleSize * 0.4}px`,
            fontWeight: 500,
            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
            wordBreak: 'break-word',
            maxWidth: '40%',
          }}
        >
          {song.title}
        </Typography>

        {/* Navigation info - center */}
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            px: 2,
            py: 1,
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

        {/* Spacer for right side */}
        <Box sx={{ width: '40%' }} />
      </Box>
    </Box>
  );
}

