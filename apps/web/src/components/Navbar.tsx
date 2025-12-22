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
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  History as HistoryIcon,
  EventNote as EventNoteIcon,
  LiveTv as LiveTvIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import SettingsDialog, { SettingsDialogRef } from './SettingsDialog';
import { useAuth } from '../contexts/AuthContext';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { useServicePlans, useServicePlan } from '../hooks/useServicePlans';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import { useState, useRef, useCallback } from 'react';

const ADMIN_ROLE_ID = '1161734352447746110';

// Helper component for Plans nested menu
export function PlansMenu({
  anchorEl,
  onClose,
  allPlans,
  planId,
  isServicePlansPage,
  onNavigate,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  allPlans?: Array<{ id: string; name: string; date?: string; items: Array<unknown> }>;
  planId: string | null;
  isServicePlansPage: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
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
          onClose();
          onNavigate('/service-plans');
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
              onClose();
              onNavigate(`/service-plans/${plan.id}`);
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
  );
}

// Helper component for User Menu
export function UserMenu({
  user,
  anchorEl,
  onClose,
  plansMenuAnchorEl,
  onPlansMenuOpen,
  onPlansMenuClose,
  allPlans,
  planId,
  isServicePlansPage,
  isLivePage,
  isAdmin,
  isExporting,
  exportZipIsFetching,
  onNavigate,
  onExportZip,
  onOpenSettings,
  onLogout,
}: {
  user: { username?: string; avatar?: string | null; discordId: string };
  anchorEl: HTMLElement | null;
  onClose: () => void;
  plansMenuAnchorEl: HTMLElement | null;
  onPlansMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onPlansMenuClose: () => void;
  allPlans?: Array<{ id: string; name: string; date?: string; items: Array<unknown> }>;
  planId: string | null;
  isServicePlansPage: boolean;
  isLivePage: boolean;
  isAdmin: boolean | undefined;
  isExporting?: boolean;
  exportZipIsFetching?: boolean;
  onNavigate: (path: string) => void;
  onExportZip?: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
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
            <Typography
              variant="caption"
              sx={{ fontSize: '0.75rem', color: 'text.secondary', userSelect: 'none' }}
            >
              Zalogowano jako{' '}
              <strong style={{ fontWeight: 600, userSelect: 'none' }}>{user.username}</strong>
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={onPlansMenuOpen}
          sx={{
            minHeight: 48,
            py: 1.25,
          }}
        >
          <EventNoteIcon sx={{ mr: 1.5, fontSize: 20 }} />
          <ListItemText>Plany Nabożeństwa</ListItemText>
          <ArrowDropDownIcon sx={{ ml: 'auto', fontSize: 20 }} />
        </MenuItem>
        <PlansMenu
          anchorEl={plansMenuAnchorEl}
          onClose={onPlansMenuClose}
          allPlans={allPlans}
          planId={planId}
          isServicePlansPage={isServicePlansPage}
          onNavigate={path => {
            onPlansMenuClose();
            onClose();
            onNavigate(path);
          }}
        />
        <MenuItem
          onClick={() => {
            onClose();
            onNavigate('/live');
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
        {onExportZip && (
          <>
            <MenuItem
              onClick={onExportZip}
              disabled={isExporting || exportZipIsFetching}
              sx={{
                minHeight: 48,
                py: 1.25,
              }}
            >
              <DownloadIcon sx={{ mr: 1.5, fontSize: 20 }} />
              {isExporting || exportZipIsFetching ? 'Eksportowanie...' : 'Eksportuj'}
            </MenuItem>
            <Divider />
          </>
        )}
        {!onExportZip && <Divider />}
        {isAdmin && (
          <MenuItem
            onClick={() => {
              onClose();
              onNavigate('/audit-logs');
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
            onClose();
            onOpenSettings();
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
          onClick={onLogout}
          sx={{
            minHeight: 48,
            py: 1.25,
          }}
        >
          <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Wyloguj
        </MenuItem>
      </Menu>
    </>
  );
}

// Helper component for User Avatar with menu trigger
export function UserAvatar({
  user,
  onClick,
}: {
  user: { username?: string; avatar?: string | null; discordId: string };
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
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
      onClick={onClick}
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
  );
}

// Helper component for Right side (User menu or Login button)
export function RightSideContent({
  isAuthenticated,
  user,
  isLoading,
  hasToken,
  isApiError,
  anchorEl,
  plansMenuAnchorEl,
  allPlans,
  planId,
  isServicePlansPage,
  isLivePage,
  isAdmin,
  isExporting,
  exportZipIsFetching,
  onMenuOpen,
  onMenuClose,
  onPlansMenuOpen,
  onPlansMenuClose,
  onNavigate,
  onExportZip,
  onOpenSettings,
  onLogout,
  onDiscordLogin,
  settingsDialogRef,
}: {
  isAuthenticated: boolean;
  user: {
    username?: string;
    avatar?: string | null;
    discordId: string;
    discordRoles?: string[] | null;
  } | null;
  isLoading: boolean;
  hasToken: boolean;
  isApiError: boolean;
  anchorEl: HTMLElement | null;
  plansMenuAnchorEl: HTMLElement | null;
  allPlans?: Array<{ id: string; name: string; date?: string; items: Array<unknown> }>;
  planId: string | null;
  isServicePlansPage: boolean;
  isLivePage: boolean;
  isAdmin: boolean | undefined;
  isExporting?: boolean;
  exportZipIsFetching?: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onPlansMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onPlansMenuClose: () => void;
  onNavigate: (path: string) => void;
  onExportZip?: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onDiscordLogin: () => void;
  settingsDialogRef: React.RefObject<SettingsDialogRef>;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
      {isLoading && hasToken ? null : isAuthenticated && user ? (
        <>
          <UserAvatar user={user} onClick={onMenuOpen} />
          <UserMenu
            user={user}
            anchorEl={anchorEl}
            onClose={onMenuClose}
            plansMenuAnchorEl={plansMenuAnchorEl}
            onPlansMenuOpen={onPlansMenuOpen}
            onPlansMenuClose={onPlansMenuClose}
            allPlans={allPlans}
            planId={planId}
            isServicePlansPage={isServicePlansPage}
            isLivePage={isLivePage}
            isAdmin={isAdmin}
            isExporting={isExporting}
            exportZipIsFetching={exportZipIsFetching}
            onNavigate={onNavigate}
            onExportZip={onExportZip}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
          />
          <Box sx={{ display: 'none' }}>
            <SettingsDialog ref={settingsDialogRef} />
          </Box>
        </>
      ) : !hasToken && !isLoading ? (
        <>
          <Button variant="contained" onClick={onDiscordLogin} disabled={isApiError} size="small">
            Zaloguj
          </Button>
          <Box sx={{ display: 'none' }}>
            <SettingsDialog ref={settingsDialogRef} />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [plansMenuAnchorEl, setPlansMenuAnchorEl] = useState<null | HTMLElement>(null);
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);
  const { data: allPlans } = useServicePlans();
  const exportZip = useExportZip();
  const { showSuccess, showError } = useNotification();
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<number>(0);

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

  const handleExportZip = useCallback(async () => {
    // Prevent multiple clicks - debounce of 3 seconds
    const now = Date.now();
    const timeSinceLastExport = now - lastExportTime;
    const DEBOUNCE_TIME = 3000; // 3 seconds

    if (isExporting || exportZip.isFetching || timeSinceLastExport < DEBOUNCE_TIME) {
      // Already exporting or too soon since last export
      return;
    }

    setIsExporting(true);
    setLastExportTime(now);
    handleMenuClose(); // Close menu when starting export

    try {
      // Use React Query to fetch (will use cache if available)
      const blob = await exportZip.refetch();

      if (blob.data) {
        const url = window.URL.createObjectURL(blob.data);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `openlp-songs-${timestamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccess('Eksport zakończony pomyślnie!');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Nie udało się wyeksportować pieśni. Spróbuj ponownie.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, exportZip, lastExportTime, showSuccess, showError]);

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const isHomePage = location.pathname === '/';
  const isServicePlansPage = location.pathname.startsWith('/service-plans');
  const isServicePlanDetailPage = /^\/service-plans\/[^/]+$/.test(location.pathname);
  const isLivePage = location.pathname === '/live';

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
          <RightSideContent
            isAuthenticated={isAuthenticated}
            user={user}
            isLoading={isLoading}
            hasToken={hasToken}
            isApiError={isApiError}
            anchorEl={anchorEl}
            plansMenuAnchorEl={plansMenuAnchorEl}
            allPlans={allPlans}
            planId={planId}
            isServicePlansPage={isServicePlansPage}
            isLivePage={isLivePage}
            isAdmin={isAdmin}
            isExporting={isExporting}
            exportZipIsFetching={exportZip.isFetching}
            onMenuOpen={handleMenuOpen}
            onMenuClose={handleMenuClose}
            onPlansMenuOpen={handlePlansMenuOpen}
            onPlansMenuClose={handlePlansMenuClose}
            onNavigate={navigate}
            onExportZip={handleExportZip}
            onOpenSettings={() => settingsDialogRef.current?.open()}
            onLogout={handleLogout}
            onDiscordLogin={handleDiscordLogin}
            settingsDialogRef={settingsDialogRef}
          />
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

        <RightSideContent
          isAuthenticated={isAuthenticated}
          user={user}
          isLoading={isLoading}
          hasToken={hasToken}
          isApiError={isApiError}
          anchorEl={anchorEl}
          plansMenuAnchorEl={plansMenuAnchorEl}
          allPlans={allPlans}
          planId={planId}
          isServicePlansPage={isServicePlansPage}
          isLivePage={isLivePage}
          isAdmin={isAdmin}
          isExporting={isExporting}
          exportZipIsFetching={exportZip.isFetching}
          onMenuOpen={handleMenuOpen}
          onMenuClose={handleMenuClose}
          onPlansMenuOpen={handlePlansMenuOpen}
          onPlansMenuClose={handlePlansMenuClose}
          onNavigate={navigate}
          onExportZip={handleExportZip}
          onOpenSettings={() => settingsDialogRef.current?.open()}
          onLogout={handleLogout}
          onDiscordLogin={handleDiscordLogin}
          settingsDialogRef={settingsDialogRef}
        />
      </Toolbar>
    </AppBar>
  );
}
