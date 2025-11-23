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
  const [isErrorState, setIsErrorState] = useState(false);

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
        background: !isHomePage
          ? (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1A2332 0%, #1E2A3A 50%, #1F2D3F 100%)'
                : 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #d4e1f0 100%)'
          : 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!isHomePage && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, currentColor 0%, transparent 50%), radial-gradient(circle at 80% 80%, currentColor 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {!isHomePage && !isErrorState && <Navbar />}
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
      {isHomePage && (
        <Box
          sx={{
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Footer />
        </Box>
      )}
    </Box>
  );
}

