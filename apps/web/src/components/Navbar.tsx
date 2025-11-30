import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Menu, MenuItem, Divider, Button } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logout as LogoutIcon, Settings as SettingsIcon, Home as HomeIcon, History as HistoryIcon, EventNote as EventNoteIcon, LiveTv as LiveTvIcon } from '@mui/icons-material';
import SettingsDialog, { SettingsDialogRef } from './SettingsDialog';
import { useAuth } from '../contexts/AuthContext';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { useState, useRef } from 'react';

const ADMIN_ROLE_ID = '1161734352447746110';

export default function Navbar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);
  
  // Check if API is working using cached songs (no unnecessary requests)
  const { error: apiError } = useCachedSongs();
  const isApiError = !!apiError;
  
  // Check if there's a token in localStorage synchronously to avoid showing login button during initial load
  // Use useState with function initializer to check localStorage only once on mount
  const [hasToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  });

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
        {/* Left: Home, Service Plans, and Live */}
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
          <IconButton
            component={Link}
            to="/service-plans"
            size="medium"
            sx={{
              color: 'text.primary',
            }}
            aria-label="Plany Nabożeństw"
          >
            <EventNoteIcon />
          </IconButton>
          <IconButton
            component={Link}
            to="/live"
            size="medium"
            sx={{
              color: 'text.primary',
            }}
            aria-label="Na żywo"
          >
            <LiveTvIcon />
          </IconButton>
        </Box>

        {/* Right: User menu / Settings */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/* Show nothing while loading if user might be authenticated (has token) */}
          {/* Show login button only if we're sure user is not authenticated */}
          {isLoading && hasToken ? null : isAuthenticated && user ? (
            <>
              {/* User Avatar - clickable to open menu on all screen sizes */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: { xs: 0.5, md: 1 },
                  py: 0.5,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={handleMenuOpen}
              >
                <Avatar 
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined}
                  sx={{ 
                    width: { xs: 32, md: 36 }, 
                    height: { xs: 32, md: 36 },
                    cursor: 'pointer',
                    bgcolor: !user.avatar ? 'action.selected' : undefined,
                    color: !user.avatar ? 'text.primary' : undefined,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  {!user.avatar ? (user.username?.[0]?.toUpperCase() ?? 'U') : null}
                </Avatar>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    display: { xs: 'none', md: 'block' },
                    fontWeight: 500,
                    maxWidth: 120,
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
                    <Avatar 
                      src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined}
                      sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: !user.avatar ? 'action.selected' : undefined,
                        color: !user.avatar ? 'text.primary' : undefined,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {!user.avatar ? (user.username?.[0]?.toUpperCase() ?? 'U') : null}
                    </Avatar>
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
                    sx={{
                      minHeight: 48,
                      py: 1.25,
                    }}
                  >
                    <HistoryIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Logi Audytu
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={() => {
                    handleMenuClose();
                    settingsDialogRef.current?.open();
                  }}
                  sx={{
                    minHeight: 48,
                    py: 1.25,
                  }}
                >
                  <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Ustawienia
                </MenuItem>
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    minHeight: 48,
                    py: 1.25,
                  }}
                >
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Wyloguj
                </MenuItem>
              </Menu>

              {/* Settings dialog - hidden but accessible via menu */}
              <Box sx={{ display: 'none' }}>
                <SettingsDialog ref={settingsDialogRef} />
              </Box>
            </>
          ) : !hasToken && !isLoading ? (
            <>
              {/* Login button - only show if we're sure user is not authenticated (no token and not loading) */}
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
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

