/**
 * Casual mode → existing field mapping helpers.
 *
 * Casual UI exposes simplified controls that map to the same DB schema
 * used by serious mode, ensuring data compatibility across modes.
 */

import type { TeeRoutine, StartLineVal, FeelVal } from './types';

/* ── Tee Shot mappings ─────────────────────────────────── */

/** Casual tee result → TeeRoutine.landing */
export const CASUAL_TEE_RESULT_MAP: Record<string, TeeRoutine['landing']> = {
  FW: 'FW',
  Rough: 'RO',
  Bunker: 'BK',
  Hazard: 'HZ',
  OB: 'OB',
  Trouble: null, // no direct mapping, stored as null
};

/** Casual tee direction → TeeRoutine.resultStartLine */
export const CASUAL_TEE_DIR_MAP: Record<string, StartLineVal> = {
  L: 'pull',
  C: 'straight',
  R: 'push',
};

/** Casual tee contact → TeeRoutine.feel */
export const CASUAL_TEE_CONTACT_MAP: Record<string, FeelVal> = {
  solid: 'flushed',
  mishit: 'toe', // representative of mishit
};

/* ── Putt miss side mappings ─────────────────────────────── */
export const CASUAL_PUTT_MISS_MAP: Record<string, 'left' | 'good' | 'right'> = {
  L: 'left',
  C: 'good',
  R: 'right',
};
