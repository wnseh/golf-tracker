import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';
import { testCredentials } from './env';
import { cleanupE2ERounds } from './cleanup';

setup('로그인하고 세션을 저장한다', async ({ page }) => {
  const { email, password } = testCredentials();

  await cleanupE2ERounds();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'My Rounds' })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
