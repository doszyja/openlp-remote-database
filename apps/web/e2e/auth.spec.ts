import { test, expect } from '@playwright/test';
import { setupSongApiMock, setupAuthMock } from './utils/mockApi';

test('completes login when Discord callback provides a token', async ({ page }) => {
  await setupSongApiMock(page);
  await setupAuthMock(page, { username: 'Editor', hasEditPermission: true });

  await page.goto('/auth/callback?token=e2e-token');

  await expect(page).toHaveURL(/\/songs$/);
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token')))
    .toBe('e2e-token');
  await expect(page.getByRole('button', { name: 'Dodaj Pieśń' })).toBeVisible();
});

test('shows a helpful error when Discord denies access', async ({ page }) => {
  await setupSongApiMock(page);
  await setupAuthMock(page, null);

  await page.goto('/auth/callback?error=missing_role');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Nie masz uprawnień');
  await expect(page).toHaveURL(/\/songs$/, { timeout: 6000 });
});

