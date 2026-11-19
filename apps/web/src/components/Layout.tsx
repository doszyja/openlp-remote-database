import { Box } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isSongListPage = location.pathname === '/songs'; // Only exact /songs, not /songs/:id
  const [isErrorState, setIsErrorState] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Track actual viewport height for mobile browsers (handles Chrome's dynamic UI)
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use visualViewport if available (better for mobile)
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(vh);
      // Also set CSS custom property for use in styles
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateViewportHeight();

    // Listen to both resize and visualViewport changes
    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  // Check if body has error-state class
  useEffect(() => {
    const checkErrorState = () => {
      setIsErrorState(document.body.classList.contains('error-state'));
    };

    // Check initially
    checkErrorState();

    // Watch for changes
    const observer = new MutationObserver(checkErrorState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        // Only constrain height on /songs page (mobile), other pages scroll normally
        // Use actual viewport height from JS for mobile (handles Chrome's dynamic URL bar)
        height: {
          xs: isSongListPage ? (viewportHeight ? `${viewportHeight}px` : '100dvh') : 'auto',
          sm: 'auto',
        },
        maxHeight: {
          xs: isSongListPage ? (viewportHeight ? `${viewportHeight}px` : '100dvh') : 'none',
          sm: 'none',
        },
        bgcolor: isHomePage ? 'transparent' : 'background.default',
        position: 'relative',
        overflow: { xs: isSongListPage ? 'hidden' : 'visible', sm: 'visible' },
        ...(isSongListPage
          ? {
              '@media (max-width: 600px)': {
                height: viewportHeight ? `${viewportHeight}px` : '100dvh',
                maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
                overflow: 'hidden',
              },
            }
          : {}),
      }}
    >
      {!isHomePage && !isErrorState && !location.pathname.match(/^\/service-plans\/[^/]+$/) && (
        <Navbar />
      )}
      {location.pathname.match(/^\/service-plans\/[^/]+$/) && <Navbar />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          minHeight: 0, // Allow flexbox to shrink
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
}
