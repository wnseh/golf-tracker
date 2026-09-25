import { test, expect } from '@playwright/test';

/**
 * PWA 설치 요건 (Phase 5A). manifest·sw·아이콘은 로그인 없이 받아야 하므로 쿠키 없는 컨텍스트로 검사한다.
 * 서비스 워커 등록은 production 빌드에서만 하므로 BASE_URL(배포본)일 때만 검사한다.
 */
test.describe('PWA', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('manifest가 로그인 없이 열리고 설치 요건을 갖춘다', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    expect(m.name).toBe('Golf Tracker');
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('sw.js와 아이콘이 로그인 없이 열린다', async ({ request }) => {
    for (const path of ['/sw.js', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/apple-icon.png', '/icon.svg']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
    }
    const sw = await request.get('/sw.js');
    expect(sw.headers()['content-type']).toContain('javascript');
    expect(await sw.text()).not.toContain("addEventListener('fetch'");   // 5A: 캐시·오프라인 없음
  });

  test('로그인 페이지에 manifest·theme-color·apple 메타가 있다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0a0a');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Golf');
  });

  test('배포본에서는 서비스 워커가 등록된다', async ({ page }) => {
    test.skip(!process.env.BASE_URL, 'production 빌드에서만 등록');
    await page.goto('/login');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
  });
});
