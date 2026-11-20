import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { InstallMobile as InstallMobileIcon } from '@mui/icons-material';
import { isIosDevice } from '../hooks/pwaInstallDetection';
import PwaIosInstallInstructions from './PwaIosInstallInstructions';

export const PWA_IOS_INSTALL_OPEN_EVENT = 'openlp:open-pwa-ios-install';

export function openPwaIosInstallModal(): void {
  window.dispatchEvent(new CustomEvent(PWA_IOS_INSTALL_OPEN_EVENT));
}

export default function PwaInstallIosDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isIosDevice()) return;
    const onOpen = () => setOpen(true);
    window.addEventListener(PWA_IOS_INSTALL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PWA_IOS_INSTALL_OPEN_EVENT, onOpen);
  }, []);

  if (!isIosDevice()) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="xs"
      disableScrollLock
      sx={{ zIndex: theme => theme.zIndex.modal + 2 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InstallMobileIcon color="primary" />
        Dodaj śpiewnik na ekran główny
      </DialogTitle>
      <DialogContent dividers>
        <PwaIosInstallInstructions />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} variant="contained" fullWidth>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}