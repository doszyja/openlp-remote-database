import { useState, forwardRef, useImperativeHandle } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { songsCache } from '../services/songs-cache';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../contexts/NotificationContext';

export interface SettingsDialogRef {
  open: () => void;
}

function SettingsDialogContent({ onClose }: { onClose: () => void }) {
  const { mode, toggleMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Check if API is working using cached songs (no unnecessary requests)
  const { error: apiError } = useCachedSongs();
  const isApiError = !!apiError;

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    window.location.href = `${apiUrl}/auth/discord`;
  };

  const handleClearCache = async () => {
    if (
      !window.confirm(
        'Czy na pewno chcesz wyczyścić cache? Wszystkie zapisane pieśni zostaną usunięte z pamięci przeglądarki i będą pobrane ponownie z serwera.'
      )
    ) {
      return;
    }

    setIsClearingCache(true);
    try {
      // Clear songs cache
      songsCache.clearCache();

      // Clear React Query cache for songs
      queryClient.invalidateQueries({ queryKey: ['cached-songs'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.removeQueries({ queryKey: ['cached-songs'] });
      queryClient.removeQueries({ queryKey: ['songs'] });

      showSuccess('Cache został wyczyszczony. Pieśni zostaną pobrane ponownie z serwera.');

      // Refresh cache immediately
      await songsCache.refreshCache();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showError('Nie udało się wyczyścić cache. Spróbuj ponownie.');
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Ustawienia</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ minWidth: 300 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Konto
          </Typography>
          {isAuthenticated ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Zalogowano jako
              </Typography>
              <Typography variant="body1" fontWeight={500} gutterBottom>
                {user?.username}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Zaloguj się, aby edytować i usuwać pieśni
              </Typography>
              <Button
                variant="contained"
                onClick={handleDiscordLogin}
                disabled={isApiError}
                fullWidth
                sx={{
                  mt: 1,
                  color: 'primary.contrastText',
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '&:disabled': {
                    backgroundColor: 'action.disabledBackground',
                    color: 'action.disabled',
                  },
                }}
              >
                Zaloguj
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Wygląd
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={toggleMode}
                color={mode === 'dark' ? 'default' : 'primary'}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: mode === 'dark' ? '#fff' : undefined,
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: mode === 'dark' ? '#fff' : undefined,
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Tryb Ciemny</Typography>
                <Typography variant="caption" color="text.secondary">
                  Przełącz między jasnym i ciemnym motywem
                </Typography>
              </Box>
            }
            sx={{ width: '100%', alignItems: 'flex-start', m: 0 }}
          />

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearCache}
            disabled={isClearingCache}
            fullWidth
            sx={{
              mt: 1,
            }}
          >
            {isClearingCache ? 'Czyszczenie...' : 'Wyczyść Cache'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          Zamknij
        </Button>
      </DialogActions>
    </>
  );
}

export interface SettingsDialogProps {
  small?: boolean;
}

const SettingsDialog = forwardRef<SettingsDialogRef, SettingsDialogProps>(
  ({ small = false }, ref) => {
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
    }));

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return (
      <>
        <Tooltip title="Ustawienia">
          <IconButton
            onClick={handleOpen}
            color="inherit"
            aria-label="settings"
            size={small ? 'small' : 'medium'}
            sx={small ? { p: 0.5 } : undefined}
          >
            <SettingsIcon fontSize={small ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              m: { xs: 1, sm: 2 },
              maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 32px)' },
            },
          }}
        >
          <SettingsDialogContent onClose={handleClose} />
        </Dialog>
      </>
    );
  }
);

SettingsDialog.displayName = 'SettingsDialog';

export default SettingsDialog;
