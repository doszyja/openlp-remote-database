import { useState } from 'react';
import { Alert, IconButton, Collapse } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import PwaInstallSection, { pwaInstallSectionHasContent } from './PwaInstallSection';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISS_KEY = 'pwa-install-banner-dismissed';

export default function PwaInstallBanner() {
  const pwa = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  const hasContent = pwaInstallSectionHasContent(pwa, 'banner');
  const visible = hasContent && !dismissed;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Collapse in={visible} unmountOnExit>
      <Alert
        severity="info"
        icon={false}
        sx={{
          mb: 2.5,
          alignItems: 'flex-start',
          '& .MuiAlert-message': { width: '100%', pr: 0 },
        }}
        action={
          <IconButton
            aria-label="zamknij"
            size="small"
            onClick={handleDismiss}
            sx={{ mt: -0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <PwaInstallSection variant="banner" pwa={pwa} onInstalled={handleDismiss} />
      </Alert>
    </Collapse>
  );
}