import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Stack,
  Paper,
  FormControlLabel,
  Switch,
  Avatar,
  alpha,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  LibraryMusic as LibraryMusicIcon,
  Add as AddIcon,
  Help as HelpIcon,
  DeveloperMode as DeveloperModeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrlForOAuth } from '../utils/apiUrl';
import { discordAvatarUrl } from '../utils/discordAvatar';
import SettingsDialog, { SettingsDialogRef } from '../components/SettingsDialog';
import { useServicePlans } from '../hooks/useServicePlans';
import { UserAvatar, UserMenu } from '../components/Navbar';
import ThemeModeSelect from '../components/ThemeModeSelect';
import { useExportZip } from '../hooks/useExportZip';
import { useNotification } from '../contexts/NotificationContext';
import PwaInstallBanner from '../components/PwaInstallBanner';

const ADMIN_ROLE_ID = '1161734352447746110';

const homeTileBorderColor = (theme: Theme) =>
  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.28)';

const homeDashboardIconColor = (theme: Theme) =>
  theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000';

const homeTileSx = {
  p: { xs: 3, sm: 3.5 },
  minHeight: { xs: 96, sm: 108 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: (theme: Theme) => homeTileBorderColor(theme),
  bgcolor: 'background.paper',
  display: 'flex',
  alignItems: 'center',
  gap: { xs: 2, sm: 2.5 },
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:hover': {
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.08),
  },
};

const homeTileIconSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: { xs: 40, sm: 44 },
  minWidth: { xs: 40, sm: 44 },
};

const homeTileIconGlyphSx = {
  fontSize: { xs: 36, sm: 40 },
  color: (theme: Theme) => homeDashboardIconColor(theme),
};

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isLoading, hasEditPermission } = useAuth();
  const isDev = import.meta.env.DEV;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [plansMenuAnchorEl, setPlansMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [adminAuditMenuAnchorEl, setAdminAuditMenuAnchorEl] = useState<null | HTMLElement>(null);
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);
  const exportZip = useExportZip();
  const { showSuccess, showError } = useNotification();
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState(0);
  const { data: allPlans } = useServicePlans();
  const isLivePage = location.pathname === '/live';
  const isAuditLogsPage = location.pathname === '/audit-logs';
  const isSpellcheckPage = location.pathname === '/reports/spellcheck';
  const isServicePlansPage = location.pathname.startsWith('/service-plans');
  const planIdMatch = location.pathname.match(/^\/service-plans\/([^/]+)$/);
  const planId = planIdMatch ? planIdMatch[1] : null;

  const [hasToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  });

  const [devUserType, setDevUserType] = useState<'admin' | 'regular'>(() => {
    const stored = localStorage.getItem('dev-user-type');
    return stored === 'admin' || stored === 'regular' ? stored : 'admin';
  });

  const handleDiscordLogin = () => {
    const apiUrl = getApiUrlForOAuth();
    window.location.href = `${apiUrl}/auth/discord`;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setPlansMenuAnchorEl(null);
    setAdminAuditMenuAnchorEl(null);
  };

  const handlePlansMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPlansMenuAnchorEl(event.currentTarget);
  };

  const handlePlansMenuClose = () => {
    setPlansMenuAnchorEl(null);
  };

  const handleAdminAuditMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAdminAuditMenuAnchorEl(event.currentTarget);
  };

  const handleAdminAuditMenuClose = () => {
    setAdminAuditMenuAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleDevLogin = () => {
    const apiUrl = getApiUrlForOAuth();
    const typeParam = devUserType === 'admin' ? '?type=admin' : '';
    window.location.href = `${apiUrl}/auth/dev${typeParam}`;
  };

  const handleUserTypeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.checked ? 'admin' : 'regular';
    setDevUserType(newType);
    localStorage.setItem('dev-user-type', newType);
  };

  const handleExportZip = useCallback(async () => {
    const now = Date.now();
    const DEBOUNCE_MS = 3000;
    if (isExporting || exportZip.isFetching || now - lastExportTime < DEBOUNCE_MS) {
      return;
    }
    setIsExporting(true);
    setLastExportTime(now);
    try {
      const blob = await exportZip.refetch();
      if (blob.data) {
        const url = window.URL.createObjectURL(blob.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `openlp-songs-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccess('Eksport zakończony pomyślnie!');
      }
    } catch {
      showError('Nie udało się wyeksportować pieśni. Spróbuj ponownie.');
    } finally {
      setIsExporting(false);
    }
  }, [exportZip, isExporting, lastExportTime, showError, showSuccess]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        minHeight: 0,
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <ThemeModeSelect />
        {isAuthenticated && user ? (
          <>
            <UserAvatar user={user} onClick={handleMenuOpen} />
            <UserMenu
              user={user}
              anchorEl={anchorEl}
              onClose={handleMenuClose}
              plansMenuAnchorEl={plansMenuAnchorEl}
              onPlansMenuOpen={handlePlansMenuOpen}
              onPlansMenuClose={handlePlansMenuClose}
              adminAuditMenuAnchorEl={adminAuditMenuAnchorEl}
              onAdminAuditMenuOpen={handleAdminAuditMenuOpen}
              onAdminAuditMenuClose={handleAdminAuditMenuClose}
              allPlans={allPlans}
              planId={planId}
              isServicePlansPage={isServicePlansPage}
              isLivePage={isLivePage}
              isAuditLogsPage={isAuditLogsPage}
              isSpellcheckPage={isSpellcheckPage}
              isAdmin={isAdmin}
              hasEditPermission={hasEditPermission}
              isExporting={isExporting}
              exportZipIsFetching={exportZip.isFetching}
              onExportZip={hasEditPermission ? handleExportZip : undefined}
              onNavigate={navigate}
              onOpenSettings={() => settingsDialogRef.current?.open()}
              onLogout={handleLogout}
            />
            <Box sx={{ display: 'none' }}>
              <SettingsDialog ref={settingsDialogRef} />
            </Box>
          </>
        ) : !hasToken && !isLoading ? (
          <Button variant="contained" onClick={handleDiscordLogin} size="small">
            Zaloguj
          </Button>
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: { xs: 'flex-start', sm: 'center' },
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          overflow: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 600, md: 640 } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: '1.65rem', sm: '2rem' },
              color: 'text.primary',
            }}
          >
            Pieśni Zborowe
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              lineHeight: 1.55,
              fontSize: { xs: '1rem', sm: '1.0625rem' },
              fontWeight: 400,
              color: 'text.secondary',
            }}
          >
            Zarządzaj pieśniami zborowymi i synchronizuj z OpenLP
          </Typography>

          {isAuthenticated && user?.username && (
            <Stack
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 3.5, width: '100%', textAlign: 'center' }}
            >
              <Avatar
                src={discordAvatarUrl(user.discordId, user.avatar)}
                sx={{
                  width: { xs: 80, sm: 96 },
                  height: { xs: 80, sm: 96 },
                  bgcolor: 'primary.main',
                  fontSize: { xs: '2rem', sm: '2.35rem' },
                }}
              >
                {user.username?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
              <Typography
                variant="h5"
                component="p"
                sx={{
                  fontSize: { xs: '1.35rem', sm: '1.6rem' },
                  fontWeight: 500,
                  color: 'text.secondary',
                  lineHeight: 1.35,
                }}
              >
                Witaj,{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {user.username}
                </Box>
              </Typography>
            </Stack>
          )}

          <PwaInstallBanner />

          <Stack spacing={{ xs: 2.25, sm: 2.5 }}>
            <Paper elevation={0} onClick={() => navigate('/songs')} sx={homeTileSx}>
              <Box sx={homeTileIconSx}>
                <LibraryMusicIcon sx={homeTileIconGlyphSx} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '1.2rem', sm: '1.35rem' },
                    mb: 0.75,
                    color: 'text.primary',
                  }}
                >
                  Przeglądaj pieśni
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 400,
                    lineHeight: 1.45,
                    color: 'text.secondary',
                  }}
                >
                  Wyszukuj i otwieraj pieśni z biblioteki
                </Typography>
              </Box>
              <ChevronRightIcon
                sx={{
                  fontSize: { xs: 32, sm: 36 },
                  color: (theme: Theme) => homeDashboardIconColor(theme),
                }}
              />
            </Paper>

            {hasEditPermission && (
              <Paper elevation={0} onClick={() => navigate('/songs/new')} sx={homeTileSx}>
                <Box sx={homeTileIconSx}>
                  <AddIcon sx={homeTileIconGlyphSx} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '1.2rem', sm: '1.35rem' },
                      mb: 0.75,
                      color: 'text.primary',
                    }}
                  >
                    Dodaj nową pieśń
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: '0.95rem', sm: '1rem' },
                      fontWeight: 400,
                      lineHeight: 1.45,
                      color: 'text.secondary',
                    }}
                  >
                    Utwórz wpis w śpiewniku zborowym
                  </Typography>
                </Box>
                <ChevronRightIcon
                  sx={{
                    fontSize: { xs: 32, sm: 36 },
                    color: (theme: Theme) => homeDashboardIconColor(theme),
                  }}
                />
              </Paper>
            )}

            <Paper elevation={0} onClick={() => navigate('/help')} sx={homeTileSx}>
              <Box sx={homeTileIconSx}>
                <HelpIcon sx={homeTileIconGlyphSx} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '1.2rem', sm: '1.35rem' },
                    mb: 0.75,
                    color: 'text.primary',
                  }}
                >
                  Instrukcja użytkownika
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 400,
                    lineHeight: 1.45,
                    color: 'text.secondary',
                  }}
                >
                  Jak korzystać z aplikacji
                </Typography>
              </Box>
              <ChevronRightIcon
                sx={{
                  fontSize: { xs: 32, sm: 36 },
                  color: (theme: Theme) => homeDashboardIconColor(theme),
                }}
              />
            </Paper>
          </Stack>

          {isDev && (
            <Paper
              elevation={0}
              sx={{
                mt: 2.5,
                p: { xs: 3, sm: 3.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: (theme: Theme) => homeTileBorderColor(theme),
              }}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={homeTileIconSx}>
                  <DeveloperModeIcon sx={homeTileIconGlyphSx} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.2rem' }}>
                    Dev login
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Szybkie logowanie bez Discord OAuth
                  </Typography>
                </Box>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={devUserType === 'admin'}
                    onChange={handleUserTypeToggle}
                  />
                }
                label={
                  <Typography variant="body1" fontWeight={500}>
                    {devUserType === 'admin' ? 'Administrator' : 'Użytkownik (tylko odczyt)'}
                  </Typography>
                }
                sx={{ mb: 2, ml: 0 }}
              />
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleDevLogin}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '1rem',
                  py: 1.25,
                  bgcolor: '#9a3412',
                  color: '#FFFFFF',
                  '&:hover': {
                    bgcolor: '#7c2d12',
                  },
                }}
              >
                Zaloguj jako {devUserType === 'admin' ? 'administrator' : 'developer'}
              </Button>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}