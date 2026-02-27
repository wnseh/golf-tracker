import type {
  StgIntent, TeeRoutine, StgShot, PuttCard, HoleFormState,
  ShapeVal, TrajVal, WindStr, WindDir, FeelVal, ReadVal, PuttFeelVal,
  StartLineVal, CurveVal, WeatherVal, InputMode,
  LeaveDistBucket, PuttDistBucket,
} from './types';

/* ── Ground-Shot metadata ────────────────────────────────── */
export const GS_META: Record<StgIntent, {
  label: string; color: string; dimColor: string;
  placeholder: string; distLabel: string;
}> = {
  approach: { label: 'APPROACH', color: 'yellow', dimColor: 'yellow-dim', placeholder: '137', distLabel: 'Dist to Pin (m)' },
  arg:      { label: 'ARG',      color: 'red',    dimColor: 'red-dim',    placeholder: '25',  distLabel: 'Dist to Pin (m)' },
  layup:    { label: 'LAYUP',    color: 'blue',   dimColor: 'blue-dim',   placeholder: '200', distLabel: 'Carry Target (m)' },
  recovery: { label: 'RECOVERY', color: 'purple', dimColor: 'purple-dim', placeholder: '73',  distLabel: 'Distance (m)' },
};

export const GS_CLUBS: Record<StgIntent, string[]> = {
  approach: ['LW','SW','GW','AW','PW','9I','8I','7I','6I','5I','4I','3I','4H','3H','5W','3W','DR'],
  arg:      ['LW','SW','GW','AW','PW','9I','8I','7I','PT'],
  layup:    ['SW','AW','PW','9I','8I','7I','6I','5I','4I','3I','4H','3H','5W','3W'],
  recovery: ['LW','SW','PW','9I','8I','7I','6I','5I','3I','4H','3H','5W','3W'],
};

export const GS_RESULTS: Record<StgIntent, string[]> = {
  approach: ['GIR','Rough','Bunker','Short','Long','Left','Right'],
  arg:      ['Close (<2m)','Mid (2-5m)','Long (5m+)','Over','Short','Left','Right'],
  layup:    ['Fairway','Rough','Bunker','Perfect Spot'],
  recovery: ['Fairway','Rough','Playable','Still Trouble'],
};

export const GS_ARG_TYPES = ['Chip','Pitch','Bunker','Lob','Bump & Run'] as const;

/* ── Tee-shot clubs ──────────────────────────────────────── */
export const TEE_CLUBS = ['DR','3W','5W','3H','4H','3I','4I','5I'] as const;

/* ── Shape: StartLine + Curve (2-row) ────────────────────── */
export const START_LINES: StartLineVal[] = ['pull', 'straight', 'push'];
export const CURVES: CurveVal[] = ['duck-hook', 'hook', 'draw', 'straight', 'fade', 'slice', 'shank'];

/* ── Shared enums ────────────────────────────────────────── */
export const SHAPES: ShapeVal[] = [
  'duck-hook','hook','pull','draw','straight','fade','push','slice','shank',
];

export const TRAJECTORIES: TrajVal[] = ['low','mid','high'];

export const WIND_STRENGTHS: WindStr[] = ['none','weak','strong','gusty'];

export const WIND_DIRECTIONS: WindDir[] = [
  'ul','into','ur','left','calm','right','dl','down','dr',
];

export const WIND_DIR_LABELS: Record<WindDir, string> = {
  ul: '↖', into: '↑', ur: '↗',
  left: '←', calm: '⊙', right: '→',
  dl: '↙', down: '↓', dr: '↘',
};

/* ── Feel / Landing / Read ───────────────────────────────── */
export const FEEL_OPTIONS: FeelVal[] = ['flushed','toe','heel','high','low'];

export const LANDING_OPTIONS = ['FW','RO','BK','HZ','OB'] as const;

export const READ_OPTIONS: ReadVal[] = ['R--','R-','R0','R+','R++'];

/* ── Lie options ─────────────────────────────────────────── */
export const LIE_QUALITY = ['clean','rough','sand','divot','bad'] as const;
export const LIE_BALL = ['up','buried'] as const;
export const LIE_SLOPE = ['flat', 'uphill','downhill','toe-up','toe-dn'] as const;
export const LIE_STANCE = ['stable','unstable'] as const;

/* ── Putting options ─────────────────────────────────────── */
export const PUTT_SLOPES = ['flat','uphill','downhill','up-down','down-up'] as const;
export const PUTT_BREAKS = ['straight','left','right','double'] as const;
export const PUTT_POST_SPEEDS = ['short','good','long'] as const;
export const PUTT_START_LINES = ['left','good','right'] as const;
export const PUTT_FEELS: PuttFeelVal[] = ['solid','pushed','pulled','thin','decel'];

/* ── Learn options ───────────────────────────────────────── */
export const LEARN_TYPES = ['gain confidence','lesson','note'] as const;

/* ── Club configuration ──────────────────────────────────── */
export const ALL_CLUB_OPTIONS = [
  'DR','mini-DR','3W','4W','5W','6W','7W','8W','9W',
  '3H','4H','5H','6H','7H','8H','9H',
  '1I','2I','3I','4I','5I','6I','7I','8I','9I',
  'PW','AW','GW','SW','LW',
] as const;

export const WEDGE_DEGREES = Array.from({ length: 27 }, (_, i) => `${48 + i}°`);

export const DEFAULT_CLUBS: { name: string; carryMale: number; carryFemale: number }[] = [
  { name: 'DR',  carryMale: 200, carryFemale: 160 },
  { name: '3W',  carryMale: 180, carryFemale: 140 },
  { name: '5W',  carryMale: 170, carryFemale: 130 },
  { name: '3H',  carryMale: 170, carryFemale: 132 },
  { name: '4H',  carryMale: 160, carryFemale: 127 },
  { name: '4I',  carryMale: 160, carryFemale: 127 },
  { name: '5I',  carryMale: 150, carryFemale: 118 },
  { name: '6I',  carryMale: 140, carryFemale: 109 },
  { name: '7I',  carryMale: 130, carryFemale: 100 },
  { name: '8I',  carryMale: 120, carryFemale: 91 },
  { name: '9I',  carryMale: 110, carryFemale: 81 },
  { name: 'PW',  carryMale: 100, carryFemale: 68 },
  { name: 'GW',  carryMale: 85,  carryFemale: 54 },
  { name: 'SW',  carryMale: 70,  carryFemale: 45 },
  { name: 'LW',  carryMale: 55,  carryFemale: 36 },
];

/* ── Weather ────────────────────────────────────────────── */
export const WEATHER_OPTIONS: WeatherVal[] = ['sunny', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'fog'];
export const WEATHER_LABELS: Record<WeatherVal, string> = {
  sunny: 'Sunny', 'partly-cloudy': 'Partly Cloudy', cloudy: 'Cloudy',
  rain: 'Rain', snow: 'Snow', fog: 'Fog',
};
export const WEATHER_ICONS: Record<WeatherVal, string> = {
  sunny: '☀️', 'partly-cloudy': '⛅', cloudy: '☁️',
  rain: '🌧️', snow: '❄️', fog: '🌫️',
};

/* ── Mode ───────────────────────────────────────────────── */
export const MODE_OPTIONS: InputMode[] = ['fun', 'casual', 'serious'];
export const MODE_LABELS: Record<InputMode, string> = {
  fun: '명랑', casual: '대강', serious: '진지',
};
export const MODE_DESCRIPTIONS: Record<InputMode, string> = {
  fun: '스코어만 기록',
  casual: '간단한 샷 결과 기록',
  serious: '프리샷/포스트샷 루틴 상세 기록',
};
export const MODE_COLORS: Record<InputMode, string> = {
  fun: 'accent', casual: 'yellow', serious: 'blue',
};

/* ── Casual Mode Constants ──────────────────────────────── */
export const CASUAL_TEE_RESULTS = ['FW', 'Rough', 'Bunker', 'Hazard', 'OB', 'Trouble'] as const;
export const CASUAL_TEE_DIRECTIONS = ['L', 'C', 'R'] as const;
export const CASUAL_TEE_CONTACTS = ['solid', 'mishit'] as const;
export const CASUAL_DIST_BUCKETS: Record<string, string[]> = {
  approach: ['<100m', '100-150m', '150-200m', '200m+'],
  arg: ['<20m', '20-50m', '50-100m'],
  layup: ['<150m', '150-200m', '200m+'],
  recovery: ['<50m', '50-100m', '100m+'],
};
export const CASUAL_DIST_MID_VALUES: Record<string, number> = {
  '<20m': 10, '20-50m': 35, '50-100m': 75,
  '<50m': 25, '<100m': 75, '100-150m': 125, '150-200m': 175, '200m+': 220, '100m+': 130,
  '<150m': 120,
};
export const CASUAL_GS_RESULTS: Record<string, string[]> = {
  approach: ['GIR', 'Short', 'Long', 'Left', 'Right', 'Bunker'],
  arg: ['Close', 'Mid', 'Long', 'Over', 'Short'],
  layup: ['Fairway', 'Rough', 'Bunker', 'Perfect'],
  recovery: ['Fairway', 'Rough', 'Playable', 'Still Trouble'],
};
export const CASUAL_LIE_SIMPLE = ['clean', 'rough', 'sand', 'bad'] as const;

/* ── Phase 4A: Leave / Putt distance buckets ──────────────── */
export const LEAVE_DIST_BUCKETS: LeaveDistBucket[] = ['ON', '0-2m', '2-5m', '5m+', 'PEN'];
export const PUTT_DIST_BUCKETS: PuttDistBucket[] = ['0-1m', '1-2m', '2-5m', '5-8m', '8m+'];

/** Map a numeric putt distance (string) → PuttDistBucket */
export function distToPuttBucket(dist: string | null): PuttDistBucket | null {
  const n = parseFloat(dist ?? '');
  if (isNaN(n) || n <= 0) return null;
  if (n <= 1) return '0-1m';
  if (n <= 2) return '1-2m';
  if (n <= 5) return '2-5m';
  if (n <= 8) return '5-8m';
  return '8m+';
}

/** Auto-map casual approach result → LeaveDistBucket (null = no suggestion) */
export function approachResultToLeaveBucket(result: string | null): LeaveDistBucket | null {
  if (!result) return null;
  if (result === 'GIR') return 'ON';
  return null; // other results need manual selection
}

/** Auto-map casual ARG result → LeaveDistBucket (null = no suggestion) */
export function argResultToLeaveBucket(result: string | null): LeaveDistBucket | null {
  if (!result) return null;
  if (result === 'Close') return '0-2m';
  if (result === 'Mid') return '2-5m';
  if (result === 'Long') return '5m+';
  if (result === 'Still Trouble') return 'PEN';
  return null;
}

/** Auto-map recovery result → LeaveDistBucket */
export function recoveryResultToLeaveBucket(result: string | null): LeaveDistBucket | null {
  if (result === 'Still Trouble') return 'PEN';
  return null;
}

// Casual putt dist buckets updated to Phase 4 spec
export const CASUAL_PUTT_DIST_BUCKETS: PuttDistBucket[] = PUTT_DIST_BUCKETS;
export const CASUAL_PUTT_DIST_MID_VALUES: Record<string, number> = {
  '0-1m': 0.5, '1-2m': 1.5, '2-5m': 3.5, '5-8m': 6.5, '8m+': 12,
};
export const CASUAL_PUTT_MISS_SIDES = ['L', 'C', 'R'] as const;

/* ── Empty-state helpers (with defaults) ─────────────────── */
export function emptyTeeRoutine(): TeeRoutine {
  return {
    windStr: 'none', windDir: 'calm',
    targetTraj: 'mid', targetStartLine: 'straight', targetCurve: 'straight',
    landing: null, actualCarry: null,
    resultTraj: 'mid', resultStartLine: 'straight', resultCurve: 'straight',
    feel: null, commit: null,
    learnType: null, learnNote: null,
  };
}

export function emptyStgShot(intent: StgIntent = 'approach'): StgShot {
  return {
    intent, dist: '', club: '',
    windStr: 'none', windDir: 'calm',
    lieQuality: 'clean', lieBall: null, lieSlope: ['flat'], lieStance: null,
    argType: null, targetTraj: 'mid', targetStartLine: 'straight', targetCurve: 'straight',
    result: null, resTraj: 'mid', resStartLine: 'straight', resCurve: 'straight',
    feel: null, commit: null, learnType: null, note: null,
    leaveDistBucket: null,
  };
}

export function emptyPuttCard(): PuttCard {
  return {
    dist: '3', distBucket: '2-5m', slope: 'flat', break: null, preSpeed: null,
    outcome: null, postSpeed: null, startLine: null,
    read: null, feel: null, note: null,
  };
}

export function emptyHoleFormState(par = 4): HoleFormState {
  return {
    par,
    score: par,
    teeClub: '',
    teeCarry: '',
    teeRoutine: emptyTeeRoutine(),
    stgShots: [],
    puttCards: [],
    notes: '',
    shotsToGreenOverride: null,
  };
}
