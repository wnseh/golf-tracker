import { test, expect } from '@playwright/test';
import { testCredentials } from './env';

test.describe('인증', () => {
  test.describe('미인증', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const path of ['/', '/card', '/analysis', '/settings', '/round/00000000-0000-0000-0000-000000000000']) {
      test(`${path} 접근 시 /login 으로 보낸다`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login$/);
      });
    }

    test('잘못된 비밀번호는 에러를 보여주고 머문다', async ({ page }) => {
      const { email } = testCredentials();
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('definitely-wrong-password');
      await page.getByTestId('login-submit').click();
      await expect(page.getByTestId('login-error')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    });

    test('올바른 계정으로 로그인하면 홈으로 간다', async ({ page }) => {
      const { email, password } = testCredentials();
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'My Rounds' })).toBeVisible();
    });
  });

  test('인증 상태에서 /login 은 홈으로 보낸다', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });

  test.describe('로그아웃', () => {
    // 공유 세션을 건드리지 않도록 이 테스트만 새로 로그인한다
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Settings 에서 Sign Out 하면 로그인 페이지로 간다', async ({ page }) => {
      const { email, password } = testCredentials();
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL('/');

      await page.goto('/settings');
      await page.getByTestId('sign-out').click();
      await expect(page).toHaveURL(/\/login$/);
      await page.goto('/');
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
