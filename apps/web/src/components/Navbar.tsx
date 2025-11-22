import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { MusicNote as MusicNoteIcon } from '@mui/icons-material';
import SettingsDialog from './SettingsDialog';

export default function Navbar() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <MusicNoteIcon color="primary" />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                display: { xs: 'none', sm: 'block' },
                color: 'text.primary',
              }}
            >
              OpenLP Songs
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsDialog />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

