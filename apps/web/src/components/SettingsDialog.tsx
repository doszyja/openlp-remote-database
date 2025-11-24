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
import { Settings as SettingsIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSongs } from '../hooks/useSongs';

export interface SettingsDialogRef {
  open: () => void;
}

function SettingsDialogContent({ onClose }: { onClose: () => void }) {
  const { mode, toggleMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  
  // Check if API is working by trying to fetch songs
  const { error: apiError } = useSongs({ page: 1, limit: 1 });
  const isApiError = !!apiError;

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    window.location.href = `${apiUrl}/auth/discord`;
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

const SettingsDialog = forwardRef<SettingsDialogRef>((_props, ref) => {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Ustawienia">
        <IconButton onClick={handleOpen} color="inherit" aria-label="settings">
          <SettingsIcon />
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
});

SettingsDialog.displayName = 'SettingsDialog';

export default SettingsDialog;

