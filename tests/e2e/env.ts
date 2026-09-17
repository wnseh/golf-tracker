/** 테스트 계정/백엔드 설정. 값이 없으면 e2e 프로젝트는 명확한 메시지로 실패한다. */
export function testCredentials(): { email: string; password: string } {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL / TEST_PASSWORD 가 없습니다. .env.local 에 테스트 계정을 넣어 주세요 (.env.local.example 참고).',
    );
  }
  return { email, password };
}

export const E2E_PREFIX = '[E2E]';

export function e2eCourseName(suffix: string): string {
  return `${E2E_PREFIX} ${suffix} ${Date.now().toString(36)}`;
}
