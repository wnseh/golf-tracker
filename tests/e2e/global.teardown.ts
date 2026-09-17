import { cleanupE2ERounds } from './cleanup';

export default async function globalTeardown() {
  try {
    const n = await cleanupE2ERounds();
    if (n > 0) console.log(`[e2e] cleaned ${n} [E2E] round(s)`);
  } catch (e) {
    console.warn('[e2e] cleanup skipped:', (e as Error).message);
  }
}
