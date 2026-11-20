export const PWA_INSTALLED_STORAGE_KEY = 'openlp-pwa-installed';

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1) {
    return true;
  }
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return true;
  const uad = (window.navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  if (uad?.platform === 'iOS') return true;
  return false;
}

export function isChromeIos(): boolean {
  if (typeof window === 'undefined') return false;
  return isIosDevice() && /CriOS/i.test(window.navigator.userAgent);
}

const STANDALONE_DISPLAY_MODES = [
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
] as const;

/** Uruchomienie ze skrótu PWA / dodane do ekranu głównego (nie zwykła karta Chrome). */
export function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  for (const mode of STANDALONE_DISPLAY_MODES) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) {
      return true;
    }
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  return false;
}

export function readPersistedPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistPwaInstalled(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, '1');
  } catch {
    /* storage blocked */
  }
}

/**
 * Zainstalowana PWA.
 * Na iOS liczy się tylko uruchomienie ze skrótu (standalone) — localStorage i related apps
 * w Safari/Chrome iOS mylą UI („już zainstalowane” bez przycisku instrukcji).
 */
export function detectPwaInstalled(): boolean {
  if (detectStandalone()) return true;
  if (isIosDevice()) return false;
  return readPersistedPwaInstalled();
}