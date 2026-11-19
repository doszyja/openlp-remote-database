import { IconButton, Tooltip } from '@mui/material';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { mode, toggleMode } = useTheme();

  const iconColor = mode === 'light' ? '#000000' : '#FFFFFF';

  return (
    <Tooltip title={`Przełącz na tryb ${mode === 'light' ? 'ciemny' : 'jasny'}`}>
      <IconButton
        onClick={toggleMode}
        size="small"
        aria-label="toggle theme"
        sx={{
          color: iconColor,
          backgroundImage: 'none',
          '& .MuiSvgIcon-root': {
            color: iconColor,
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
  );
}
