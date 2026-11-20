import { useState } from 'react';
import { Alert, IconButton, Collapse, Typography } from '@mui/material';
import { InstallMobile as InstallMobileIcon } from '@mui/icons-material';
import { Close as CloseIcon } from '@mui/icons-material';
import PwaInstallSection, { pwaInstallSectionHasContent } from './PwaInstallSection';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISS_KEY = 'pwa-install-banner-dismissed';

export default function PwaInstallBanner() {
  const pwa = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  const hasContent = pwaInstallSectionHasContent(pwa, 'banner');
  const visible = hasContent && !dismissed;
  const canDismiss = hasContent;

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
        icon={<InstallMobileIcon fontSize="inherit" />}
        sx={{
          mb: 2.5,
          alignItems: 'flex-start',
          '& .MuiAlert-message': { width: '100%', pr: 0 },
        }}
        action={
          canDismiss ? (
            <IconButton
              aria-label="zamknij"
              size="small"
              onClick={handleDismiss}
              sx={{ mt: -0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : undefined
        }
      >
        {pwa.canPromptInstall || pwa.showIosInstallGuide ? (
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.75 }}>
            {pwa.showIosInstallGuide ? 'Aplikacja na iPhone / iPad' : 'Możesz zainstalować śpiewnik'}
          </Typography>
        ) : null}
        <PwaInstallSection variant="banner" pwa={pwa} onInstalled={handleDismiss} />
      </Alert>
    </Collapse>
  );
}