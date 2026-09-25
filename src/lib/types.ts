/* ── 공통 enum ───────────────────────────────────────────── */
export type WeatherVal = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'fog';

/* ── SG 원장 ─────────────────────────────────────────────── */

/**
 * 샷을 친 후 공이 놓인 곳.
 * HZ = 페널티 구역(+1). dist = 드롭 지점에서 남은 거리, 다음 샷은 러프에서 친 것으로 본다.
 * OB = 아웃 오브 바운즈. dist가 null이면 "다시 치기"(+1, 같은 자리에서 다시),
 *      dist가 있으면 "특설티·드롭"(+2, 그 거리의 페어웨이에서). 규칙은 ledger.ts.
 */
export type Lie = 'FW' | 'RO' | 'SA' | 'TR' | 'GR' | 'HZ' | 'OB' | 'HOLED';
/** 샷을 치기 전 위치의 라이 (TEE 포함, HOLED·HZ·OB 제외 — 그 다음 샷의 출발은 ledger.ts가 정한다) */
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
 * 원장 항목 하나 = 샷 하나. lie/dist는 "친 후" 위치. pen은 이 샷에 붙은 그 외 1벌타(HZ/OB 벌타는 자동).
 * strike는 원장 입력 시 퍼트가 아니면 'ok'로 시작하고 미스 토글로 바꾼다.
 * 필드가 없거나 null이면 미기록(N/A) — 이 필드 도입 전 데이터와 퍼트.
 * driver는 파4·파5에서 티(TEE)에서 친 샷에만 (OB 다시 치기 후 두 번째 티샷 포함). true로 시작하고 토글로 false(우드·유틸·아이언).
 * 다른 샷·파3은 필드 없음. 없거나 null이면 미기록(N/A).
 */
export interface Shot {
  lie:     Lie;
  dist:    DistBucket | null;   // HOLED, OB 다시 치기면 null
  pen:     boolean;
  strike?: Strike | null;
  driver?: boolean | null;
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
