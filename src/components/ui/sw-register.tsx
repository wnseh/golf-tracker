'use client';

import { useEffect } from 'react';
import { logWarn, describeError } from '@/lib/log';

/** 서비스 워커 등록 (production만). dev에서는 HMR과 섞이지 않도록 등록하지 않는다. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => logWarn('sw.register', describeError(err).message));
  }, []);
  return null;
}
