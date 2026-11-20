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
import { openPwaIosInstallModal } from './PwaInstallIosDialog';
import PwaIosInstallInstructions from './PwaIosInstallInstructions';

export type PwaInstallState = ReturnType<typeof usePwaInstall>;

export interface PwaInstallSectionProps {
  /** Compact layout for banners; default is settings panel */
  variant?: 'settings' | 'banner';
  onInstalled?: () => void;
  /** Zamknij nadrzędny dialog (np. ustawienia) przed modalem iOS — unika zasłonięcia przez MUI Dialog */
  onBeforeOpenIosGuide?: () => void;
  pwa: PwaInstallState;
}

export function pwaInstallSectionHasContent(
  pwa: PwaInstallState,
  variant: 'settings' | 'banner',
): boolean {
  if (pwa.isInstalled) return variant === 'settings';
  if (variant === 'banner') return pwa.canPromptInstall || pwa.showIosInstallGuide;
  return pwa.canPromptInstall || pwa.showIosInstallGuide || !pwa.isInstalled;
}

export default function PwaInstallSection({
  variant = 'settings',
  onInstalled,
  onBeforeOpenIosGuide,
  pwa,
}: PwaInstallSectionProps) {
  const { canPromptInstall, showIosInstallGuide, isInstalled, isInstalling, install } = pwa;

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

  if (showIosInstallGuide) {
    const openIosGuide = () => {
      onBeforeOpenIosGuide?.();
      window.setTimeout(() => openPwaIosInstallModal(), 0);
    };
    return (
      <Box>
        {variant === 'settings' ? (
          <Typography variant="body1" sx={{ mb: 1 }}>
            Zainstaluj na urządzeniu
          </Typography>
        ) : null}
        <PwaIosInstallInstructions compact={variant === 'banner'} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, mb: 1.5, display: 'block' }}>
          Po dodaniu uruchamiaj śpiewnik z ikony na ekranie głównym — szybszy dostęp i cache offline.
        </Typography>
        {variant === 'settings' ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<InstallMobileIcon />}
            onClick={openIosGuide}
          >
            Pokaż w oknie dialogowym
          </Button>
        ) : null}
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