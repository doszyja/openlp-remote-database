import { useState } from 'react';
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
} from '@mui/material';
import { Settings as SettingsIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function SettingsDialogContent({ onClose }: { onClose: () => void }) {
  const { mode, toggleMode } = useTheme();

  return (
    <>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ minWidth: 300 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Appearance
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={toggleMode}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Dark Mode</Typography>
                <Typography variant="caption" color="text.secondary">
                  Switch between light and dark theme
                </Typography>
              </Box>
            }
            sx={{ width: '100%', alignItems: 'flex-start', m: 0 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
}

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Settings">
        <IconButton onClick={handleOpen} color="inherit" aria-label="settings">
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <SettingsDialogContent onClose={handleClose} />
      </Dialog>
    </>
  );
}

