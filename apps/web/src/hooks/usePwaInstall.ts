import { useCallback, useEffect, useState } from 'react';
import {
  detectPwaInstalled,
  detectStandalone,
  isChromeIos,
  isIosDevice,
  persistPwaInstalled,
} from './pwaInstallDetection';

export { isChromeIos, isIosDevice };

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function syncInstalledState(
  setIsInstalled: (value: boolean) => void,
  setDeferredPrompt: (value: BeforeInstallPromptEvent | null) => void,
): void {
  const installed = detectPwaInstalled();
  setIsInstalled(installed);
  if (installed) {
    setDeferredPrompt(null);
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(detectPwaInstalled);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    syncInstalledState(setIsInstalled, setDeferredPrompt);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (isIosDevice() || detectPwaInstalled()) {
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      persistPwaInstalled();
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const onDisplayModeChange = () => {
      syncInstalledState(setIsInstalled, setDeferredPrompt);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    const displayModeQueries = [
      'standalone',
      'fullscreen',
      'minimal-ui',
      'window-controls-overlay',
    ].map(mode => window.matchMedia(`(display-mode: ${mode})`));
    for (const mq of displayModeQueries) {
      mq.addEventListener('change', onDisplayModeChange);
    }

    const getInstalledRelatedApps = navigator.getInstalledRelatedApps;
    if (!isIosDevice() && getInstalledRelatedApps) {
      void getInstalledRelatedApps
        .call(navigator)
        .then(related => {
          if (related.length > 0) {
            persistPwaInstalled();
            setIsInstalled(true);
            setDeferredPrompt(null);
          }
        })
        .catch(() => {
          /* API niedostępne lub brak uprawnień */
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      for (const mq of displayModeQueries) {
        mq.removeEventListener('change', onDisplayModeChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        persistPwaInstalled();
        setIsInstalled(true);
        return true;
      }
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const canPromptInstall =
    Boolean(deferredPrompt) && !isInstalled && !isIosDevice();
  const showIosInstallGuide = isIosDevice() && !detectStandalone();

  return {
    canPromptInstall,
    showIosInstallGuide,
    isInstalled,
    isInstalling,
    isStandaloneSession: detectStandalone(),
    install,
  };
}