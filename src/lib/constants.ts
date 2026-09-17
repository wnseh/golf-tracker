import type {
  Lie, StartLie, GroundDist, GreenDist, DistBucket, HoleLenBucket,
  Shot, HoleFormState, WeatherVal,
} from './types';

/* ── 라이 ────────────────────────────────────────────────── */
export const LIE_OPTIONS: Lie[] = ['FW', 'RO', 'SA', 'TR', 'GR', 'HOLED'];
export const LIE_LABELS: Record<Lie | StartLie, string> = {
  TEE: 'Tee', FW: 'FW', RO: 'Rough', SA: 'Sand', TR: 'Trouble', GR: 'Green', HOLED: 'In',
};
export const LIE_LONG_LABELS: Record<Lie, string> = {
  FW: '페어웨이', RO: '러프', SA: '벙커', TR: '트러블', GR: '그린', HOLED: '홀인',
};

/* ── 거리 버킷 (m) + SG 계산용 중간값 ────────────────────── */
export const GROUND_DIST_BUCKETS: GroundDist[] = ['0-20', '20-50', '50-100', '100-150', '150-200', '200+'];
export const GREEN_DIST_BUCKETS: GreenDist[] = ['0-1', '1-2', '2-5', '5-10', '10+'];

export const DIST_MID: Record<DistBucket, number> = {
  '0-20': 10, '20-50': 35, '50-100': 75, '100-150': 125, '150-200': 175, '200+': 230,
  '0-1': 0.5, '1-2': 1.5, '2-5': 3.5, '5-10': 7.5, '10+': 13,
};

/** 라이에 맞는 거리 버킷 목록 (HOLED는 없음) */
export function distBucketsFor(lie: Lie): DistBucket[] {
  if (lie === 'HOLED') return [];
  if (lie === 'GR') return GREEN_DIST_BUCKETS;
  return GROUND_DIST_BUCKETS;
}

/* ── 홀 길이 버킷 (파별) ─────────────────────────────────── */
export interface HoleLenOption { key: HoleLenBucket; label: string; mid: number }

export const HOLE_LEN_BUCKETS: Record<number, HoleLenOption[]> = {
  3: [
    { key: 'p3:<120',    label: '<120',    mid: 105 },
    { key: 'p3:120-150', label: '120-150', mid: 135 },
    { key: 'p3:150-180', label: '150-180', mid: 165 },
    { key: 'p3:180+',    label: '180+',    mid: 195 },
  ],
  4: [
    { key: 'p4:<300',    label: '<300',    mid: 280 },
    { key: 'p4:300-350', label: '300-350', mid: 325 },
    { key: 'p4:350-400', label: '350-400', mid: 375 },
    { key: 'p4:400+',    label: '400+',    mid: 420 },
  ],
  5: [
    { key: 'p5:<450',    label: '<450',    mid: 430 },
    { key: 'p5:450-500', label: '450-500', mid: 475 },
    { key: 'p5:500+',    label: '500+',    mid: 520 },
  ],
};

export function holeLenMid(bucket: HoleLenBucket | null): number | null {
  if (!bucket) return null;
  for (const opts of Object.values(HOLE_LEN_BUCKETS)) {
    const hit = opts.find((o) => o.key === bucket);
    if (hit) return hit.mid;
  }
  return null;
}

/* ── 날씨 ───────────────────────────────────────────────── */
export const WEATHER_OPTIONS: WeatherVal[] = ['sunny', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'fog'];
export const WEATHER_LABELS: Record<WeatherVal, string> = {
  sunny: 'Sunny', 'partly-cloudy': 'Partly Cloudy', cloudy: 'Cloudy',
  rain: 'Rain', snow: 'Snow', fog: 'Fog',
};
export const WEATHER_ICONS: Record<WeatherVal, string> = {
  sunny: '☀️', 'partly-cloudy': '⛅', cloudy: '☁️',
  rain: '🌧️', snow: '❄️', fog: '🌫️',
};

/* ── 빈 상태 ─────────────────────────────────────────────── */
export function emptyShot(lie: Lie, dist: DistBucket | null): Shot {
  return { lie, dist, pen: false };
}

export function emptyHoleFormState(par = 4): HoleFormState {
  return {
    par,
    score: par,
    holeLen: null,
    shots: [],
    scoreOnly: false,
    notes: '',
  };
}

/** 오늘 날짜를 로컬 기준 YYYY-MM-DD로 */
export function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
