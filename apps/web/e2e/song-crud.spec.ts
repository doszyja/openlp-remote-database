import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setupSongApiMock, setupAuthMock } from './utils/mockApi';

async function authenticate(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem('auth_token', token);
  }, 'editor-token');
}

test('creates a new song through the form', async ({ page }) => {
  const mock = await setupSongApiMock(page);
  await setupAuthMock(page, { username: 'Editor', hasEditPermission: true });
  await authenticate(page);

  await page.goto('/songs/new');

  await page.getByLabel('Tytuł Pieśni').fill('Nowa Pieśń E2E');
  await page.getByLabel('Treść').fill('To jest zupełnie nowa pieśń\nLinia druga');
  await page.getByRole('button', { name: 'Utwórz Pieśń' }).click();

  await expect(page.getByRole('heading', { name: 'Nowa Pieśń E2E' })).toBeVisible();
  await expect(page.getByText('Pieśń została utworzona pomyślnie!')).toBeVisible();

  expect(mock.getLastCreatePayload()).toMatchObject({ title: 'Nowa Pieśń E2E' });
});

test('edits an existing song and saves changes', async ({ page }) => {
  const mock = await setupSongApiMock(page);
  await setupAuthMock(page, { username: 'Editor', hasEditPermission: true });
  await authenticate(page);

  await page.goto('/songs/song-1/edit');

  const titleInput = page.getByLabel('Tytuł Pieśni');
  await titleInput.fill('Światło Świata (E2E)');
  await page.getByLabel('Treść').first().fill('Zmieniona treść zwrotki');

  const updateButton = page.getByRole('button', { name: 'Aktualizuj' });
  await updateButton.click();

  await expect(page).toHaveURL(/\/songs\/song-1$/);
  await expect(page.getByText('Pieśń została zaktualizowana pomyślnie!')).toBeVisible();
  expect(mock.getLastUpdatePayload()).toMatchObject({ title: 'Światło Świata (E2E)' });
});

test('deletes a song from the detail page', async ({ page }) => {
  const mock = await setupSongApiMock(page);
  await setupAuthMock(page, { username: 'Editor', hasEditPermission: true });
  await authenticate(page);

  await page.goto('/songs/song-2');

  await page.getByRole('button', { name: 'Usuń' }).first().click();
  const confirmDialog = page.getByRole('dialog');
  await confirmDialog.getByRole('button', { name: 'Usuń' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Pieśń została usunięta pomyślnie!')).toBeVisible();
  expect(mock.getLastDeletedId()).toBe('song-2');
});
