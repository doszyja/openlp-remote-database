import { Box, Typography, Stack, IconButton, Tooltip } from '@mui/material';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

export default function Footer() {
  const { mode, toggleMode } = useTheme();

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
    </Box>
  );
}

