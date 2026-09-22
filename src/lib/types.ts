/* ── 공통 enum ───────────────────────────────────────────── */
export type WeatherVal = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'fog';

/* ── SG 원장 ─────────────────────────────────────────────── */

/** 샷을 친 후 공이 놓인 곳 */
export type Lie = 'FW' | 'RO' | 'SA' | 'TR' | 'GR' | 'HOLED';
/** 샷을 치기 전 위치의 라이 (TEE 포함, HOLED 제외) */
export type StartLie = 'TEE' | 'FW' | 'RO' | 'SA' | 'TR' | 'GR';

/** 그린 밖 남은 거리 버킷 (m) */
export type GroundDist = '0-20' | '20-50' | '50-100' | '100-150' | '150-200' | '200+';
/** 그린 위 남은 거리 버킷 (m) */
export type GreenDist = '0-1' | '1-2' | '2-5' | '5-10' | '10+';
export type DistBucket = GroundDist | GreenDist;

/** 홀 길이 버킷 (파별) */
export type HoleLenBucket =
  | 'p3:<120' | 'p3:120-150' | 'p3:150-180' | 'p3:180+'
  | 'p4:<300' | 'p4:300-350' | 'p4:350-400' | 'p4:400+'
  | 'p5:<450' | 'p5:450-500' | 'p5:500+';

/** 컨택. ok = 정상, miss = 뒤땅·탑·힐·토 등 미스. 퍼트는 기록하지 않는다(null). */
export type Strike = 'ok' | 'miss';

/**
 * 원장 항목 하나 = 샷 하나. lie/dist는 "친 후" 위치. pen은 이 샷에 붙은 1벌타.
 * strike는 원장 입력 시 퍼트가 아니면 'ok'로 시작하고 미스 토글로 바꾼다.
 * 필드가 없거나 null이면 미기록(N/A) — 이 필드 도입 전 데이터와 퍼트.
 */
export interface Shot {
  lie:     Lie;
  dist:    DistBucket | null;   // HOLED이면 null
  pen:     boolean;
  strike?: Strike | null;
}

/* ── 홀 / 라운드 ─────────────────────────────────────────── */

export interface HoleFormState {
  par:       number;
  score:     number;               // 원장 완성 시 파생, 스코어만 입력 시 직접 값
  holeLen:   HoleLenBucket | null;
  shots:     Shot[];               // scoreOnly면 무시
  scoreOnly: boolean;
  notes:     string;
}

export interface HoleData {
  id?:      string;
  roundId:  string;
  holeNum:  number;
  par:      number;
  score:    number;
  holeLen:  HoleLenBucket | null;
  shots:    Shot[] | null;         // null = 스코어만 입력
  notes:    string;
  savedAt?: string;
}

export interface Round {
  id:          string;
  userId:      string;
  course:      string;
  date:        string;
  tee:         string;
  handicap:    number | null;
  rating:      number | null;
  holes:       number;
  weather:     WeatherVal | null;
  temperature: number | null;
  roundTime:   string | null;
  createdAt:   string;
}
