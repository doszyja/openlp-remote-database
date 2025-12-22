import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  History as HistoryIcon,
  EventNote as EventNoteIcon,
  LiveTv as LiveTvIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import SettingsDialog, { SettingsDialogRef } from './SettingsDialog';
import { useAuth } from '../contexts/AuthContext';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { useServicePlans, useServicePlan } from '../hooks/useServicePlans';
import { useState, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const ADMIN_ROLE_ID = '1161734352447746110';

export default function Navbar() {
  const { isAuthenticated, user, logout, isLoading, hasEditPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [homeMenuAnchorEl, setHomeMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [plansMenuAnchorEl, setPlansMenuAnchorEl] = useState<null | HTMLElement>(null);
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);
  const { data: allPlans } = useServicePlans();

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
    setPlansMenuAnchorEl(null);
  };

  const handlePlansMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPlansMenuAnchorEl(event.currentTarget);
  };

  const handlePlansMenuClose = () => {
    setPlansMenuAnchorEl(null);
  };

  const handleHomeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setHomeMenuAnchorEl(event.currentTarget);
  };

  const handleHomeMenuClose = () => {
    setHomeMenuAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const isHomePage = location.pathname === '/';
  const isServicePlansPage = location.pathname.startsWith('/service-plans');
  const isServicePlanDetailPage = /^\/service-plans\/[^/]+$/.test(location.pathname);
  const isLivePage = location.pathname === '/live';
  const isRecentChangesPage = location.pathname === '/recent-changes';
  const isAboutPage = location.pathname === '/about';
  const isHelpPage = location.pathname === '/help';

  // Get service plan ID from URL if on detail page
  const planIdMatch = location.pathname.match(/^\/service-plans\/([^/]+)$/);
  const planId = planIdMatch ? planIdMatch[1] : null;
  const { data: servicePlan } = useServicePlan(planId || '');

  // Special view for service plan detail page
  if (isServicePlanDetailPage && servicePlan) {
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flex: 1 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/songs')}
              size={isMobile ? 'medium' : 'small'}
              sx={{
                fontSize: { xs: '0.875rem', sm: '0.75rem' },
                py: { xs: 1, sm: 0.5 },
                minHeight: { xs: 44, sm: 'auto' },
                touchAction: 'manipulation',
              }}
            >
              Wstecz
            </Button>
            <Typography
              variant="h6"
              component="h1"
              sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1.1rem' }, fontWeight: 600 }}
            >
              Plan: {servicePlan.name}
            </Typography>
            {servicePlan.date && (
              <Chip
                label={new Date(servicePlan.date).toLocaleDateString('pl-PL')}
                size="small"
                sx={{
                  height: { xs: 24, sm: 20 },
                  fontSize: { xs: '0.75rem', sm: '0.7rem' },
                  '& .MuiChip-label': { px: { xs: 1, sm: 0.75 } },
                  display: { xs: 'none', sm: 'flex' },
                }}
              />
            )}
          </Box>
          {/* Right: User menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
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
                    userSelect: 'none',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={handleMenuOpen}
                >
                  <Avatar
                    src={
                      user.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                        : undefined
                    }
                    sx={{
                      width: { xs: 32, md: 36 },
                      height: { xs: 32, md: 36 },
                      cursor: 'pointer',
                      bgcolor: !user.avatar ? 'action.selected' : undefined,
                      color: !user.avatar ? 'text.primary' : undefined,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      userSelect: 'none',
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
                      userSelect: 'none',
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                      <Avatar
                        src={
                          user.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                            : undefined
                        }
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: !user.avatar ? 'action.selected' : undefined,
                          color: !user.avatar ? 'text.primary' : undefined,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          userSelect: 'none',
                        }}
                      >
                        {!user.avatar ? (user.username?.[0]?.toUpperCase() ?? 'U') : null}
                      </Avatar>
                      <Typography variant="body2" sx={{ userSelect: 'none' }}>{user.username}</Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={handlePlansMenuOpen}
                    sx={{
                      minHeight: 48,
                      py: 1.25,
                    }}
                  >
                    <EventNoteIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    <ListItemText>Plany Nabożeństwa</ListItemText>
                    <ArrowDropDownIcon sx={{ ml: 'auto', fontSize: 20 }} />
                  </MenuItem>
                  {/* Nested Menu for Plans */}
                  <Menu
                    anchorEl={plansMenuAnchorEl}
                    open={Boolean(plansMenuAnchorEl)}
                    onClose={handlePlansMenuClose}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    PaperProps={{
                      sx: {
                        mt: 0.5,
                        minWidth: 250,
                        maxHeight: 400,
                        overflow: 'auto',
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        handlePlansMenuClose();
                        handleMenuClose();
                        navigate('/service-plans');
                      }}
                      selected={isServicePlansPage && !planId}
                      sx={{
                        minHeight: 40,
                        py: 0.75,
                        fontWeight: 600,
                      }}
                    >
                      <ListItemText primary="Wszystkie plany" />
                    </MenuItem>
                    {allPlans && allPlans.length > 0 && <Divider />}
                    {allPlans && allPlans.length > 0 ? (
                      allPlans.map(plan => (
                        <MenuItem
                          key={plan.id}
                          onClick={() => {
                            handlePlansMenuClose();
                            handleMenuClose();
                            navigate(`/service-plans/${plan.id}`);
                          }}
                          selected={planId === plan.id}
                          sx={{
                            minHeight: 40,
                            py: 0.75,
                          }}
                        >
                          <ListItemText
                            primary={plan.name}
                            secondary={
                              plan.date
                                ? new Date(plan.date).toLocaleDateString('pl-PL')
                                : `${plan.items.length} ${plan.items.length === 1 ? 'pieśń' : 'pieśni'}`
                            }
                          />
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled sx={{ minHeight: 40, py: 0.75 }}>
                        <ListItemText primary="Brak planów" secondary="Utwórz pierwszy plan" />
                      </MenuItem>
                    )}
                  </Menu>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate('/live');
                    }}
                    selected={isLivePage}
                    sx={{
                      minHeight: 48,
                      py: 1.25,
                    }}
                  >
                    <LiveTvIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Na żywo
                  </MenuItem>
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
        {/* Left: Navigation - Mobile dropdown / Desktop buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flex: 1 }}>
          {/* If user is authenticated: Simplified navigation */}
          {isAuthenticated && user ? (
            isMobile ? (
              /* Mobile: Home icon + dropdown with Plans and Live */
              <>
                <IconButton
                  component={Link}
                  to="/"
                  size="medium"
                  sx={{
                    color: 'text.primary',
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1.5, sm: 2 },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    ...(isHomePage && {
                      bgcolor: 'action.selected',
                    }),
                  }}
                >
                  <HomeIcon />
                </IconButton>
                <Button
                  size="medium"
                  onClick={handleHomeMenuOpen}
                  sx={{
                    color: 'text.primary',
                    minWidth: 'auto',
                    px: 0.75,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  aria-label="Open navigation menu"
                  aria-haspopup="true"
                  aria-expanded={Boolean(homeMenuAnchorEl)}
                >
                  <ArrowDropDownIcon />
                </Button>

                {/* Mobile dropdown menu */}
                <Menu
                  anchorEl={homeMenuAnchorEl}
                  open={Boolean(homeMenuAnchorEl)}
                  onClose={handleHomeMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 220,
                    },
                  }}
                >
                  <MenuItem
                    onClick={handlePlansMenuOpen}
                    sx={{
                      minHeight: 48,
                      py: 1.25,
                    }}
                  >
                    <ListItemIcon>
                      <EventNoteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Plany Nabożeństwa</ListItemText>
                    <ArrowDropDownIcon sx={{ ml: 'auto', fontSize: 20 }} />
                  </MenuItem>
                  {/* Nested Menu for Plans (Mobile) */}
                  <Menu
                    anchorEl={plansMenuAnchorEl}
                    open={Boolean(plansMenuAnchorEl)}
                    onClose={handlePlansMenuClose}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    PaperProps={{
                      sx: {
                        mt: 0.5,
                        minWidth: 250,
                        maxHeight: 400,
                        overflow: 'auto',
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        handlePlansMenuClose();
                        handleHomeMenuClose();
                        navigate('/service-plans');
                      }}
                      selected={isServicePlansPage && !planId}
                      sx={{
                        minHeight: 40,
                        py: 0.75,
                        fontWeight: 600,
                      }}
                    >
                      <ListItemText primary="Wszystkie plany" />
                    </MenuItem>
                    {allPlans && allPlans.length > 0 && <Divider />}
                    {allPlans && allPlans.length > 0 ? (
                      allPlans.map((plan) => (
                        <MenuItem
                          key={plan.id}
                          onClick={() => {
                            handlePlansMenuClose();
                            handleHomeMenuClose();
                            navigate(`/service-plans/${plan.id}`);
                          }}
                          selected={planId === plan.id}
                          sx={{
                            minHeight: 40,
                            py: 0.75,
                          }}
                        >
                          <ListItemText
                            primary={plan.name}
                            secondary={
                              plan.date
                                ? new Date(plan.date).toLocaleDateString('pl-PL')
                                : `${plan.items.length} ${plan.items.length === 1 ? 'pieśń' : 'pieśni'}`
                            }
                          />
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled sx={{ minHeight: 40, py: 0.75 }}>
                        <ListItemText primary="Brak planów" secondary="Utwórz pierwszy plan" />
                      </MenuItem>
                    )}
                  </Menu>
                  <MenuItem
                    onClick={() => {
                      handleHomeMenuClose();
                      navigate('/live');
                    }}
                    selected={isLivePage}
                    sx={{
                      minHeight: 48,
                      py: 1.25,
                    }}
                  >
                    <ListItemIcon>
                      <LiveTvIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Na żywo</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              /* Desktop: Home icon + Plans and Live buttons */
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  component={Link}
                  to="/"
                  size="medium"
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    ...(isHomePage && {
                      bgcolor: 'action.selected',
                    }),
                  }}
                  aria-label="Home"
                >
                  <HomeIcon />
                </IconButton>
              </Box>
            )
          ) : (
            /* Not authenticated: Home button only (no dropdown) */
            <Button
              component={Link}
              to="/"
              startIcon={<HomeIcon />}
              size="medium"
              sx={{
                color: 'text.primary',
                textTransform: 'none',
                px: { xs: 1.5, sm: 2 },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                ...(isHomePage && {
                  bgcolor: 'action.selected',
                  fontWeight: 600,
                }),
              }}
              aria-label="Home"
            >
              Home
            </Button>
          )}
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
                  userSelect: 'none',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={handleMenuOpen}
              >
                <Avatar
                  src={
                    user.avatar
                      ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                      : undefined
                  }
                  sx={{
                    width: { xs: 32, md: 36 },
                    height: { xs: 32, md: 36 },
                    cursor: 'pointer',
                    bgcolor: !user.avatar ? 'action.selected' : undefined,
                    color: !user.avatar ? 'text.primary' : undefined,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    userSelect: 'none',
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
                    userSelect: 'none',
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                    <Avatar
                      src={
                        user.avatar
                          ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                          : undefined
                      }
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: !user.avatar ? 'action.selected' : undefined,
                        color: !user.avatar ? 'text.primary' : undefined,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        userSelect: 'none',
                      }}
                    >
                      {!user.avatar ? (user.username?.[0]?.toUpperCase() ?? 'U') : null}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', userSelect: 'none' }}>
                      Zalogowano jako <strong style={{ fontWeight: 600, userSelect: 'none' }}>{user.username}</strong>
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={handlePlansMenuOpen}
                  sx={{
                    minHeight: 48,
                    py: 1.25,
                  }}
                >
                  <EventNoteIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  <ListItemText>Plany Nabożeństwa</ListItemText>
                  <ArrowDropDownIcon sx={{ ml: 'auto', fontSize: 20 }} />
                </MenuItem>
                {/* Nested Menu for Plans */}
                <Menu
                  anchorEl={plansMenuAnchorEl}
                  open={Boolean(plansMenuAnchorEl)}
                  onClose={handlePlansMenuClose}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    sx: {
                      mt: 0.5,
                      minWidth: 250,
                      maxHeight: 400,
                      overflow: 'auto',
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      handlePlansMenuClose();
                      handleMenuClose();
                      navigate('/service-plans');
                    }}
                    selected={isServicePlansPage && !planId}
                    sx={{
                      minHeight: 40,
                      py: 0.75,
                      fontWeight: 600,
                    }}
                  >
                    <ListItemText primary="Wszystkie plany" />
                  </MenuItem>
                  {allPlans && allPlans.length > 0 && <Divider />}
                  {allPlans && allPlans.length > 0 ? (
                    allPlans.map((plan) => (
                      <MenuItem
                        key={plan.id}
                        onClick={() => {
                          handlePlansMenuClose();
                          handleMenuClose();
                          navigate(`/service-plans/${plan.id}`);
                        }}
                        selected={planId === plan.id}
                        sx={{
                          minHeight: 40,
                          py: 0.75,
                        }}
                      >
                        <ListItemText
                          primary={plan.name}
                          secondary={
                            plan.date
                              ? new Date(plan.date).toLocaleDateString('pl-PL')
                              : `${plan.items.length} ${plan.items.length === 1 ? 'pieśń' : 'pieśni'}`
                          }
                        />
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled sx={{ minHeight: 40, py: 0.75 }}>
                      <ListItemText primary="Brak planów" secondary="Utwórz pierwszy plan" />
                    </MenuItem>
                  )}
                </Menu>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/live');
                  }}
                  selected={isLivePage}
                  sx={{
                    minHeight: 48,
                    py: 1.25,
                  }}
                >
                  <LiveTvIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Na żywo
                </MenuItem>
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
