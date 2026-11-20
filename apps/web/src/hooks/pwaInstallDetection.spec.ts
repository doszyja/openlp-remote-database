import { afterEach, describe, expect, it } from 'vitest';
import {
  PWA_INSTALLED_STORAGE_KEY,
  detectPwaInstalled,
  persistPwaInstalled,
  readPersistedPwaInstalled,
} from './pwaInstallDetection';

describe('pwaInstallDetection', () => {
  afterEach(() => {
    localStorage.removeItem(PWA_INSTALLED_STORAGE_KEY);
  });

  it('reads persisted install flag', () => {
    expect(readPersistedPwaInstalled()).toBe(false);
    persistPwaInstalled();
    expect(readPersistedPwaInstalled()).toBe(true);
    expect(detectPwaInstalled()).toBe(true);
  });
});