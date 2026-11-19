import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Link,
  useMediaQuery,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const { mode, toggleMode } = useTheme();
  const isNarrow = useMediaQuery('(max-width: 600px)');
  const location = useLocation();
  const [appVersion, setAppVersion] = useState<string>('');

  // Hide extra content on mobile on /songs page
  const isSongsPageMobile = isNarrow && location.pathname === '/songs';

  useEffect(() => {
    const versionMeta = document.querySelector('meta[name="app-version"]');
    if (versionMeta) {
      setAppVersion(versionMeta.getAttribute('content') || '');
    }
  }, []);

  // Dominik's Discord user ID (provided by user)
  const discordUserId = '238746528372621312';
  // Link to Discord profile - user can click "Message" button there
  const discordProfileUrl = `https://discord.com/users/${discordUserId}`;

  const handleBugReport = (e: React.MouseEvent) => {
    e.preventDefault();

    // Open Discord profile page where user can click "Message" button
    window.open(discordProfileUrl, '_blank', 'noopener');
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: isSongsPageMobile ? 0 : 1.5, // No padding on mobile song list (footer is empty)
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {!isSongsPageMobile && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ mb: 1 }}
        >
          <Tooltip title={`Przełącz na tryb ${mode === 'light' ? 'ciemny' : 'jasny'}`}>
            <IconButton
              onClick={toggleMode}
              aria-label="toggle theme"
              size="small"
              sx={{
                color: mode === 'light' ? '#000000' : '#FFFFFF',
                backgroundImage: 'none',
                '& .MuiSvgIcon-root': {
                  color: mode === 'light' ? '#000000' : '#FFFFFF',
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                  backgroundImage: 'none',
                },
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      )}
      {!isSongsPageMobile && (
        <>
          <Stack spacing={0.5} alignItems="center">
            <Typography
              variant="body2"
              sx={{
                fontWeight: 400,
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                color: 'text.secondary',
              }}
            >
              Świętochłowice Kościół Wolnych Chrześcijan
            </Typography>
            <Link
              component="button"
              onClick={handleBugReport}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                color: 'text.secondary',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': {
                  color: 'text.primary',
                  textDecoration: 'underline',
                },
              }}
            >
              <BugReportIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
              Znalazłeś błąd? Napisz na Discord
            </Link>
          </Stack>
          {appVersion && (
            <Typography
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 8,
                fontSize: '0.6rem',
                color: 'text.disabled',
                fontWeight: 300,
                letterSpacing: '0.02em',
                textTransform: 'lowercase',
              }}
            >
              v{appVersion}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
