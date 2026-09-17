import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E 설정.
 * - BASE_URL 이 있으면 그 서버를 테스트 (프론트/백엔드 분리 후 배포본 검증용). 없으면 next dev 를 띄운다.
 * - TEST_EMAIL / TEST_PASSWORD: 테스트 계정. .env.local 에 두면 자동 로드.
 * - 테스트가 만드는 라운드는 코스명이 "[E2E]"로 시작하고, setup/teardown 에서 정리한다.
 */

// .env.local → process.env (dotenv 없이 최소 파서)
for (const file of ['.env.local', '.env']) {
  const p = path.resolve(__dirname, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = process.env.PORT ?? '3777';
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
export const STORAGE_STATE = path.resolve(__dirname, 'tests/.auth/user.json');

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,              // 테스트 계정 하나를 공유하므로 직렬 실행
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalTeardown: './tests/e2e/global.teardown.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 순수 계산 라이브러리 — 브라우저/서버 불필요
    { name: 'lib', testDir: 'tests/lib' },

    // 로그인 → storageState 저장 + 이전 실행이 남긴 [E2E] 라운드 정리
    { name: 'setup', testDir: 'tests/e2e', testMatch: /global\.setup\.ts/ },

    // 모바일 뷰포트(코스에서 폰으로 쓰는 앱)
    {
      name: 'e2e',
      testDir: 'tests/e2e',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
