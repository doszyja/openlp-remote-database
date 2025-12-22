import { test, expect } from '@playwright/test';
import { setupSongApiMock, setupAuthMock } from './utils/mockApi';

test('shows songs and allows searching without edit permissions', async ({ page }) => {
  await setupSongApiMock(page);
  await setupAuthMock(page, null);

  await page.goto('/songs');

  await expect(page.getByRole('heading', { name: 'Pieśni' })).toBeVisible();
  await expect(page.getByText('Światło Świata')).toBeVisible();
  await expect(page.getByText('Żywa Nadzieja')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dodaj Pieśń' })).toHaveCount(0);

  const search = page.getByPlaceholder('Szukaj pieśni...');
  await search.fill('Nadzieja');
  await page.waitForTimeout(600); // wait for debounce window
  await expect(page.getByText('Żywa Nadzieja')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Światło Świata' })).toHaveCount(0);
});

test('loads more songs when the user requests another page', async ({ page }) => {
  await setupSongApiMock(page);
  await setupAuthMock(page, null);

  await page.goto('/songs');

  const loadMore = page.getByRole('button', { name: 'Załaduj więcej' });
  await expect(loadMore).toBeVisible();
  await loadMore.click();

  await expect(page.getByText('Dodatkowa Pieśń 2-1')).toBeVisible();
});

test('recovers from API failures when retrying the list', async ({ page }) => {
  await setupSongApiMock(page, { failFirstList: true });
  await setupAuthMock(page, null);

  await page.goto('/songs');

  const errorHeading = page.getByText('Nie udało się załadować pieśni');
  await expect(errorHeading).toBeVisible();

  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(errorHeading).not.toBeVisible();
  await expect(page.getByText('Światło Świata')).toBeVisible();
});

test('allows editors to export songs when they have permissions', async ({ page }) => {
  const songMock = await setupSongApiMock(page);
  await setupAuthMock(page, { username: 'Editor', hasEditPermission: true });

  await page.addInitScript((token: string) => {
    window.localStorage.setItem('auth_token', token);
  }, 'e2e-token');

  await page.goto('/songs');

  const exportButton = page.getByRole('button', { name: 'Eksportuj' });
  await expect(exportButton).toBeVisible();
  await exportButton.click();

  await expect(page.getByText('Eksport zakończony pomyślnie!')).toBeVisible();
  expect(songMock.getExportDownloadCount()).toBe(1);
});
