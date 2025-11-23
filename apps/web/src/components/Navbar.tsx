import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Menu, MenuItem, Divider, Button } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logout as LogoutIcon, Settings as SettingsIcon, Home as HomeIcon, History as HistoryIcon } from '@mui/icons-material';
import SettingsDialog, { SettingsDialogRef } from './SettingsDialog';
import { useAuth } from '../contexts/AuthContext';
import { useSongs } from '../hooks/useSongs';
import { useState, useRef } from 'react';

const ADMIN_ROLE_ID = '1161734352447746110';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);
  
  // Check if API is working by trying to fetch songs
  const { error: apiError } = useSongs({ page: 1, limit: 1 });
  const isApiError = !!apiError;

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    window.location.href = `${apiUrl}/auth/discord`;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const isHomePage = location.pathname === '/';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        color: 'text.primary',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Toolbar 
        sx={{ 
          justifyContent: 'space-between', 
          px: { xs: 1, sm: 2 },
          minHeight: { xs: 56, sm: 64 },
          height: { xs: 56, sm: 64 },
        }}
      >
        {/* Left: Home */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flex: 1 }}>
          {!isHomePage && (
            <IconButton
              component={Link}
              to="/"
              size="medium"
              sx={{
                color: 'text.primary',
              }}
              aria-label="Home"
            >
              <HomeIcon />
            </IconButton>
          )}
        </Box>

        {/* Right: User menu / Settings */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {isAuthenticated && user ? (
            <>
              {/* User Avatar - opens menu on mobile, shows username on desktop */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: { xs: 0.5, sm: 1 },
                  py: 0.5,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={handleMenuOpen}
              >
                {user.avatar && (
                  <Avatar 
                    src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                    sx={{ 
                      width: { xs: 32, sm: 36 }, 
                      height: { xs: 32, sm: 36 },
                      cursor: 'pointer',
                    }}
                  />
                )}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    display: { xs: 'none', md: 'block' },
                    fontWeight: 500,
                    maxWidth: { md: 120 },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.username}
                </Typography>
              </Box>
              
              {/* User Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                  },
                }}
              >
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.avatar && (
                      <Avatar 
                        src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                        sx={{ width: 24, height: 24 }}
                      />
                    )}
                    <Typography variant="body2">{user.username}</Typography>
                  </Box>
                </MenuItem>
                <Divider />
                {isAdmin && (
                  <MenuItem 
                    onClick={() => {
                      handleMenuClose();
                      navigate('/audit-logs');
                    }}
                  >
                    <HistoryIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Logi Audytu
                  </MenuItem>
                )}
                <Divider />
                <MenuItem 
                  onClick={() => {
                    handleMenuClose();
                    settingsDialogRef.current?.open();
                  }}
                >
                  <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Ustawienia
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Wyloguj
                </MenuItem>
              </Menu>

              {/* Settings dialog - hidden but accessible via menu */}
              <Box sx={{ display: 'none' }}>
                <SettingsDialog ref={settingsDialogRef} />
              </Box>
            </>
          ) : (
            <>
              {/* Login button */}
              <Button
                variant="contained"
                onClick={handleDiscordLogin}
                disabled={isApiError}
                size="small"
              >
                Zaloguj
              </Button>
              {/* Settings dialog - hidden but accessible via menu (for unauthenticated users, settings can be opened from menu if needed) */}
              <Box sx={{ display: 'none' }}>
                <SettingsDialog ref={settingsDialogRef} />
              </Box>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

