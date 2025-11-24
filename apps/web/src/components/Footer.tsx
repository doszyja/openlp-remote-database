import { Box, Typography, Stack, IconButton, Tooltip, Link } from '@mui/material';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon, BugReport as BugReportIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

export default function Footer() {
  const { mode, toggleMode } = useTheme();
  
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
        py: 1.5,
        textAlign: 'center',
      }}
    >
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
            color="inherit"
            aria-label="toggle theme"
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover',
              },
            }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
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
    </Box>
  );
}

