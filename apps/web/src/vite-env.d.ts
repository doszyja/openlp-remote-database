/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}

interface RelatedWebApp {
  id?: string;
  platform: string;
  url?: string;
}

interface Navigator {
  getInstalledRelatedApps?: () => Promise<RelatedWebApp[]>;
}