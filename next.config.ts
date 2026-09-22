import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

// Sentry 빌드 플러그인. SENTRY_AUTH_TOKEN이 없으면(로컬, e2e) 소스맵 업로드는 건너뛰고 앱은 그대로 빌드된다.
// tunnelRoute는 쓰지 않는다 — middleware matcher가 미인증 POST를 /login으로 보내 터널이 깨진다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
