import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  InstallMobile as InstallMobileIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { usePwaInstall } from '../hooks/usePwaInstall';

export type PwaInstallState = ReturnType<typeof usePwaInstall>;

export interface PwaInstallSectionProps {
  /** Compact layout for banners; default is settings panel */
  variant?: 'settings' | 'banner';
  onInstalled?: () => void;
  pwa: PwaInstallState;
}

export function pwaInstallSectionHasContent(
  pwa: PwaInstallState,
  variant: 'settings' | 'banner',
): boolean {
  if (pwa.isInstalled) return variant === 'settings';
  return pwa.canPromptInstall || pwa.showIosInstallHint || variant === 'settings';
}

export default function PwaInstallSection({
  variant = 'settings',
  onInstalled,
  pwa,
}: PwaInstallSectionProps) {
  const { canPromptInstall, showIosInstallHint, isInstalled, isInstalling, install } =
    pwa;

  const handleInstall = async () => {
    const ok = await install();
    if (ok) onInstalled?.();
  };

  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <CheckCircleIcon color="success" sx={{ mt: 0.25 }} />
        <Box>
          <Typography variant="body1">Aplikacja zainstalowana</Typography>
          <Typography variant="caption" color="text.secondary">
            Śpiewnik działa w trybie samodzielnej aplikacji na tym urządzeniu.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (canPromptInstall) {
    return (
      <Box>
        {variant === 'settings' && (
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            Zainstaluj na urządzeniu
          </Typography>
        )}
        <Typography
          variant={variant === 'settings' ? 'caption' : 'body2'}
          color="text.secondary"
          sx={{ mb: variant === 'settings' ? 2 : 1.5, display: 'block' }}
        >
          Dodaj śpiewnik do ekranu głównego — szybszy dostęp i wygodniejsza praca offline po
          wczytaniu cache pieśni.
        </Typography>
        <Button
          variant="contained"
          startIcon={
            isInstalling ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <InstallMobileIcon />
            )
          }
          onClick={handleInstall}
          disabled={isInstalling}
          fullWidth={variant === 'settings'}
          size={variant === 'banner' ? 'small' : 'medium'}
        >
          {isInstalling ? 'Instalowanie…' : 'Zainstaluj aplikację'}
        </Button>
      </Box>
    );
  }

  if (showIosInstallHint) {
    return (
      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          iPhone / iPad
        </Typography>
        <Typography variant="body2" component="div">
          W Safari wybierz <strong>Udostępnij</strong> → <strong>Dodaj do ekranu początkowego</strong>,
          a następnie potwierdź. Instalacja PWA wymaga połączenia HTTPS.
        </Typography>
      </Box>
    );
  }

  if (variant === 'settings') {
    return (
      <Typography variant="caption" color="text.secondary">
        Aby zainstalować aplikację, otwórz śpiewnik w Chrome lub Edge na komputerze albo Androidzie
        (HTTPS). Przycisk instalacji pojawi się tutaj, gdy przeglądarka to umożliwi.
      </Typography>
    );
  }

  return null;
}