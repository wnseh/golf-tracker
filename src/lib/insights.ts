/**
 * insights.ts — SG 카테고리 해설. 순수 함수, Supabase 의존 없음.
 *
 * 두 층으로 나뉜다.
 *   - SG_GUIDE / SG_TOTAL_GUIDE: 카테고리가 무엇을 재고 어떻게 읽는지 (고정 문구).
 *   - selectInsights(ctx, scope): 내 숫자에 맞는 상황 해설. 규칙 배열(RULES)에서 조건이 맞는 것만 고른다.
 *
 * 문구·규칙을 고칠 땐 이 파일만 손댄다. 화면은 이 파일의 출력을 그대로 보여준다.
 * 임계값에 외부 근거가 없으면 source에 "앱 기준"이라고 적는다.
 *
 * 근거:
 *   - Broadie 2011 두 논문 (sg.ts 기준표와 동일) / Every Shot Counts (2014): 롱게임이 실력 차이의 약 2/3.
 *   - Sherman, The Four Foundations of Golf (2022) + practical-golf.com:
 *       티샷은 페어웨이보다 "인플레이"가 우선 (Shot Scope: 러프 −0.3, 나무 −1.1, 페어웨이 벙커 −1.4).
 *       어프로치는 그린 중앙 + 뒤쪽 야디지. 투어도 100yd대에서 평균 약 6m(19.5ft) 남긴다.
 *       웨지는 붙이기보다 "무조건 그린에 올리기". 대부분의 아마추어는 GIR 30% 미만.
 *       퍼팅은 스피드 컨트롤이 최우선. 투어 성공률 3–5ft 88%, 5–10ft 57%, 10–15ft 33%, 15–20ft 19%.
 *       최저 스코어는 버디가 아니라 더블보기를 줄이는 데서 온다.
 *   - Young, adamyounggolf.com (The Practice Manual / The Strike Plan):
 *       아마추어와 상급자의 가장 큰 차이는 컨택. 8번 아이언 1인치 뒤땅 −10yd, 2인치 −36yd.
 *       타점이 한쪽으로 치우치면 차등 연습, 흩어지면 변동 연습. 스윙 모양보다 컨택 자체를 연습.
 *
 * 표기 규칙: SG는 "vs Tour", 기대치는 "Riccio". "eSG", "Baseline", "핸디" 금지.
 */

import { SG_CATEGORIES, SG_CATEGORY_LABELS, type SgCategory, type SgByCategory, type SgByStrike, type SgByTeeClub } from './sg';
import type { Ratio, RiccioEstimate } from './stats';

/* ── 입력 ─────────────────────────────────────────────────── */

export interface InsightContext {
  byCat:         SgByCategory;      // averageSG().byCat — 라운드 평균, 18홀 환산
  total:         number;
  rounds:        number;            // 원장 라운드 수
  holes:         number;            // 원장 완성 홀 합
  fir?:          Ratio;
  gir?:          Ratio;
  scramble?:     Ratio;
  threePutts?:   Ratio;
  avgPutts?:     number | null;     // 18홀 환산
  avgPenalties?: number | null;     // 라운드당
  avgDoubles?:   number | null;     // 라운드당 더블보기 이상, 18홀 환산
  mishits?:      Ratio;             // 미스 컨택 샷 / 컨택 기록 샷
  strike?:       SgByStrike;        // 컨택별 SG 합 (sumStrike)
  teeClub?:      SgByTeeClub;       // 티샷 드라이버/그 외 SG 합 (sumTeeClub)
  riccio?:       RiccioEstimate | null;
}

export type InsightScope = SgCategory | 'total';

export interface Insight {
  id:       string;
  scope:    InsightScope;
  tone:     'info' | 'warn' | 'good';
  title:    string;
  body:     string;
  source:   string;
}

/* ── 출처 ─────────────────────────────────────────────────── */

const SRC_TABLE9  = 'Broadie, "Assessing Golfer Performance on the PGA TOUR" (2011) Table 9';
const SRC_PUTT    = 'Broadie, "Putts Gained" (2011) Figure 1';
const SRC_ESC     = 'Broadie, Every Shot Counts (2014) 3장';
const SRC_RICCIO  = 'Riccio (Score ≈ 95 − 2 × GIR, Putts ≈ 37 − ⅔ × GIR)';
const SRC_SHERMAN = 'Sherman, The Four Foundations of Golf (2022)';
const SRC_PG      = 'Sherman, practical-golf.com';
const SRC_YOUNG   = 'Young, adamyounggolf.com (The Practice Manual / The Strike Plan)';
const SRC_APP     = '앱 기준';
const SRC_DEF     = 'SG 정의 (sg.ts)';

/* ── 고정 해설 ─────────────────────────────────────────────── */

export interface CategoryGuide {
  what:    string;   // 무엇을 재나
  reading: string;   // 읽는 법
  action:  string;   // Biggest Leak 카드의 Action
  source:  string;
}

export const SG_GUIDE: Record<SgCategory, CategoryGuide> = {
  tee: {
    what:
      '파4·파5의 첫 샷. 홀 길이 버킷에서 출발해 친 후 라이·남은 거리로 끝난다. ' +
      '홀 길이를 입력하지 않은 홀은 티샷 SG를 건너뛴다.',
    reading:
      '거리와 벌타가 같이 들어간다. 벌타는 1타에 더해 위치 손실까지 얹힌다. ' +
      '같은 거리라면 러프는 페어웨이보다 약 0.2타, 트러블은 약 1타 더 걸린다 (100yd 기준 FW 2.80 / RO 3.02 / TR 3.80). ' +
      'Sherman이 인용한 아마추어 데이터도 같다: 러프 −0.3, 나무 −1.1, 페어웨이 벙커 −1.4. ' +
      '페어웨이를 살짝 놓친 건 싸고, OB·해저드·트러블은 비싸다. ' +
      '미스 컨택으로 표시한 샷과 정상 샷의 SG를 갈라 보면 원인이 타점인지 판단인지 나뉜다. ' +
      '드라이버로 친 티샷과 끊어간 티샷의 샷당 SG를 비교하면 클럽 선택이 이득인지 보인다.',
    action:
      '티샷에서 가장 많이 잃습니다. 페어웨이 적중률이 아니라 "인플레이"가 목표입니다. ' +
      '트러블이 있는 쪽을 피해 조준하고, 필요하면 드라이버 대신 한 클럽 짧게 잡으세요.',
    source: `${SRC_TABLE9} · ${SRC_SHERMAN}`,
  },
  approach: {
    what:
      '그린 밖 50m 초과에서 친 샷. 파3의 첫 샷도 여기 들어간다. ' +
      '친 후 그린에 올렸는지, 올렸다면 첫 퍼트가 얼마나 남았는지가 값을 정한다.',
    reading:
      'Broadie는 투어 선수 간 차이를 가장 크게 만드는 게 어프로치라고 봤고, Sherman은 GIR이 스코어와 가장 상관이 높은 stat이라고 본다. ' +
      '투어도 100~125yd 페어웨이에서 평균 약 6m(19.5ft)를 남긴다. 핀에 붙이는 게 아니라 그린에 올리는 게 기준이다. ' +
      '그린을 놓치면 손실 일부가 숏게임 카테고리로 넘어가 보이므로 어프로치와 숏게임은 짝으로 읽는다. ' +
      'Young: 아마추어 어프로치 손실의 큰 부분은 클럽 선택이 아니라 컨택이다 (8번 아이언 1인치 뒤땅 −10yd, 2인치 −36yd). 미스 샷의 SG를 따로 보라.',
    action:
      '어프로치(50m 초과)에서 가장 많이 잃습니다. 핀 대신 그린 중앙을 조준하고, 그린 뒤쪽 거리에 맞춰 클럽을 고르세요. ' +
      '아마추어의 그린 미스는 대부분 짧은 쪽입니다.',
    source: `${SRC_ESC} · ${SRC_PG} · ${SRC_YOUNG}`,
  },
  short: {
    what:
      '그린 밖 50m 이내에서 친 샷. 칩, 피치, 벙커샷. ' +
      '친 후 그린에 올렸는지와 첫 퍼트 거리가 값을 정한다.',
    reading:
      '첫 퍼트를 2m 안에 남기면 투어 기준 홀아웃 기대치가 1.3타 안쪽이다 (6ft 1.34). ' +
      '벙커는 같은 거리 페어웨이보다 약 0.1~0.2타 더 걸린다 (20yd SA 2.53 / FW 2.40). ' +
      'Sherman: 웨지는 붙이는 게 아니라 "거의 매번 그린에 올리는 것"이 목표다. 그린을 놓치는 웨지샷이 더블보기의 주범이다. ' +
      '업앤다운 실패는 숏게임과 퍼팅에 나뉘어 잡히므로 두 값을 합쳐 보는 게 정확하다.',
    action:
      '숏게임(50m 이내)에서 가장 많이 잃습니다. 붙이려 하지 말고 매번 그린에 올리는 한 가지 샷을 만드세요. ' +
      '첫 퍼트를 2m 안에 남기면 충분합니다.',
    source: `${SRC_TABLE9} · ${SRC_PUTT} · ${SRC_PG}`,
  },
  putt: {
    what:
      '그린 위에서 친 샷 전부. 첫 퍼트 거리 버킷에서 출발해 홀아웃까지.',
    reading:
      '투어 평균은 10m에서 2.0퍼트, 2.4m(8ft)에서 1.5퍼트다. 3퍼트는 거의 −1, 2퍼트는 0에 가깝고, 2m 안쪽 1퍼트가 +에 기여한다. ' +
      '투어 성공률은 3~5ft 88%, 5~10ft 57%, 10~15ft 33%, 15~20ft 19%. 3m 퍼트를 놓치는 건 투어에서도 절반이다. ' +
      '첫 퍼트 거리 기준이라 롱퍼트를 많이 남기면 퍼트 수가 정상이어도 손실로 잡히고, 반대로 GIR이 낮으면 첫 퍼트가 짧아 유리하게 나온다.',
    action:
      '퍼팅에서 가장 많이 잃습니다. 라인보다 스피드입니다. 롱퍼트를 1m 안에 붙여 3퍼트를 없애고, 1~2m 성공률을 점검하세요.',
    source: `${SRC_PUTT} · ${SRC_PG}`,
  },
};

export const SG_TOTAL_GUIDE = {
  what:
    '샷 하나의 SG = 치기 전 기대 타수 − 친 후 기대 타수 − 1 − 벌타. 기대 타수는 PGA Tour 평균. ' +
    '원장이 완성된 홀만 합산하고 18홀로 환산한 뒤 라운드 평균을 낸다.',
  reading:
    '투어 평균 대비라서 값은 대부분 음수다. 절대값보다 카테고리 간 상대 크기로 읽는다. ' +
    'Broadie는 실력 차이의 약 2/3가 롱게임(티샷+어프로치)에서, 나머지가 숏게임과 퍼팅에서 난다고 봤다. ' +
    'Sherman은 여기에 한 가지를 더한다: 최저 스코어는 버디가 아니라 더블보기를 줄이는 데서 온다. ' +
    '음수가 가장 큰 카테고리가 연습 우선순위이고, 더블보기 수가 코스 매니지먼트의 성적표다.',
  source: `${SRC_ESC} · ${SRC_SHERMAN} · ${SRC_DEF}`,
};

/* ── 상황 해설 규칙 ────────────────────────────────────────── */

export const MIN_ROUNDS_STABLE    = 5;    // 앱 기준: 이보다 적으면 순위만 참고
export const MIN_HOLES_PER_ROUND  = 12;   // 앱 기준: 이보다 적으면 18홀 환산 배율 경고
export const DOUBLES_WARN         = 3;    // 앱 기준: 라운드당 더블보기 이상이 이보다 많으면 경고
const LONG_SHARE_TYPICAL          = 2 / 3;
const CLOSE_GAP                   = 0.5;  // 앱 기준: 1·2위 차이가 이보다 작으면 둘 다
const MINOR_SHARE                 = 0.15; // 앱 기준: 손실 비중이 이보다 작으면 후순위
const RICCIO_PUTT_GAP             = 1.0;  // 앱 기준: 실제 − 기대 퍼트가 이보다 크면 실제 손실로 본다
const THREE_PUTT_WARN             = 0.15; // 앱 기준: 3퍼트율 (Sherman: 3퍼트 줄이기가 퍼팅 개선의 지름길)
const STRIKE_MIN_SHOTS            = 10;   // 앱 기준: 컨택 기록 샷이 이보다 적으면 컨택 규칙 생략
const STRIKE_LOSS_SHARE_HIGH      = 0.6;  // 앱 기준: 미스 샷이 카테고리 손실의 이 비율 이상이면 "타점 문제"
const STRIKE_LOSS_SHARE_LOW       = 0.3;  // 앱 기준: 이 비율 이하이면 "판단 문제"
const MISHIT_RATE_WARN            = 0.25; // 앱 기준: 전체 미스율
const TEE_CLUB_MIN_SHOTS          = 5;    // 앱 기준: 드라이버·그 외 각각 이보다 적으면 비교 생략
const TEE_CLUB_GAP                = 0.15; // 앱 기준: 샷당 SG 차이가 이보다 작으면 "비슷"

function signed(v: number, digits = 2) {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}
function pct(r: Ratio | undefined): number | null {
  return r && r.den > 0 ? r.hit / r.den : null;
}
function pctText(p: number) {
  return `${Math.round(p * 100)}%`;
}
function isNum(v: number | null | undefined): v is number {
  return v !== null && v !== undefined;
}

/** 카테고리의 컨택별 손실 분해. 컨택 기록 샷이 없으면 null. */
function strikeOf(ctx: InsightContext, cat: SgCategory) {
  const st = ctx.strike;
  if (!st) return null;
  const okShots = st.ok.shots[cat], missShots = st.miss.shots[cat];
  const den = okShots + missShots;
  if (den === 0) return null;
  const okLoss = Math.min(0, st.ok.sg[cat]);
  const missLoss = Math.min(0, st.miss.sg[cat]);
  const loss = okLoss + missLoss;
  return {
    okShots, missShots, den,
    missRate: missShots / den,
    okAvg: okShots > 0 ? st.ok.sg[cat] / okShots : null,
    missAvg: missShots > 0 ? st.miss.sg[cat] / missShots : null,
    missLossShare: loss < 0 ? missLoss / loss : null,
  };
}

/** 티샷 드라이버 vs 그 외 샷당 SG. 두 그룹 모두 최소 샷 수를 넘어야 비교 가능. */
function teeClubOf(ctx: InsightContext) {
  const tc = ctx.teeClub;
  if (!tc) return null;
  const d = tc.driver, o = tc.other;
  const driverAvg = d.shots > 0 ? d.sg / d.shots : null;
  const otherAvg = o.shots > 0 ? o.sg / o.shots : null;
  const comparable = d.shots >= TEE_CLUB_MIN_SHOTS && o.shots >= TEE_CLUB_MIN_SHOTS;
  return {
    driverShots: d.shots, otherShots: o.shots, driverAvg, otherAvg, comparable,
    gap: comparable ? driverAvg! - otherAvg! : null,   // + = 드라이버가 낫다
  };
}

interface Derived {
  ranked:        { cat: SgCategory; value: number }[];   // 오름차순 (가장 잃는 순)
  totalLoss:     number;                                 // 음수 카테고리 합 (≤ 0)
  share:         Record<SgCategory, number | null>;      // 손실 비중 (양수 카테고리는 null)
  longShare:     number | null;
  holesPerRound: number;
}

function derive(ctx: InsightContext): Derived {
  const ranked = SG_CATEGORIES.map((cat) => ({ cat, value: ctx.byCat[cat] })).sort((a, b) => a.value - b.value);
  const totalLoss = SG_CATEGORIES.reduce((s, c) => s + Math.min(0, ctx.byCat[c]), 0);
  const share = {} as Record<SgCategory, number | null>;
  for (const c of SG_CATEGORIES) {
    share[c] = totalLoss < 0 && ctx.byCat[c] < 0 ? ctx.byCat[c] / totalLoss : null;
  }
  const longShare = totalLoss < 0 ? (share.tee ?? 0) + (share.approach ?? 0) : null;
  return { ranked, totalLoss, share, longShare, holesPerRound: ctx.rounds > 0 ? ctx.holes / ctx.rounds : 0 };
}

interface Rule {
  id:     string;
  scope:  InsightScope | 'any-category';
  tone:   Insight['tone'];
  source: string;
  when:   (ctx: InsightContext, d: Derived, cat: SgCategory | null) => boolean;
  build:  (ctx: InsightContext, d: Derived, cat: SgCategory | null) => { title: string; body: string };
}

const RULES: Rule[] = [
  /* ── 전체 ── */
  {
    id: 'total-few-rounds', scope: 'total', tone: 'warn', source: SRC_APP,
    when: (ctx) => ctx.rounds < MIN_ROUNDS_STABLE,
    build: (ctx) => ({
      title: '표본이 적습니다',
      body: `원장 라운드 ${ctx.rounds}개. 한 라운드의 좋은 날·나쁜 날이 평균을 크게 흔듭니다. ` +
            `${MIN_ROUNDS_STABLE}라운드까지는 카테고리 순위만 참고하고 크기는 믿지 마세요.`,
    }),
  },
  {
    id: 'total-partial-rounds', scope: 'total', tone: 'warn', source: SRC_APP,
    when: (_ctx, d) => d.holesPerRound > 0 && d.holesPerRound < MIN_HOLES_PER_ROUND,
    build: (_ctx, d) => ({
      title: '18홀 환산 배율이 큽니다',
      body: `라운드당 원장 홀 평균 ${d.holesPerRound.toFixed(1)}홀. 18홀로 환산하면서 몇 홀의 결과가 ` +
            `${(18 / d.holesPerRound).toFixed(1)}배로 커집니다. 홀마다 홀아웃까지 원장을 채우면 정확해집니다.`,
    }),
  },
  {
    id: 'total-positive', scope: 'total', tone: 'good', source: SRC_APP,
    when: (ctx) => ctx.total >= 0,
    build: () => ({
      title: '투어 평균 이상입니다',
      body: `이 기간엔 PGA Tour 평균보다 잘 쳤습니다. 원장 라운드가 ${MIN_ROUNDS_STABLE}개 미만이면 우연일 수 있으니 더 쌓인 뒤 다시 보세요.`,
    }),
  },
  {
    id: 'total-long-typical', scope: 'total', tone: 'info', source: SRC_ESC,
    when: (ctx, d) => ctx.total < 0 && d.longShare !== null && d.longShare >= 0.6,
    build: (_ctx, d) => ({
      title: '전형적인 분포입니다',
      body: `롱게임(티샷+어프로치)이 손실의 ${pctText(d.longShare!)}. Broadie가 본 전형(약 ${pctText(LONG_SHARE_TYPICAL)})과 비슷합니다. ` +
            '우선순위는 티샷과 어프로치입니다.',
    }),
  },
  {
    id: 'total-short-heavy', scope: 'total', tone: 'warn', source: `${SRC_ESC} · ${SRC_PG}`,
    when: (ctx, d) => ctx.total < 0 && d.longShare !== null && d.longShare < 0.5,
    build: (_ctx, d) => ({
      title: '숏게임·퍼팅 비중이 큽니다',
      body: `숏게임+퍼팅이 손실의 ${pctText(1 - d.longShare!)}. Broadie의 전형(약 1/3)보다 큽니다. ` +
            'Sherman은 웨지가 가장 연습 안 된 영역이라 "낮게 달린 과일"이라고 봅니다. 그린 주변 연습의 효율이 높은 경우입니다. ' +
            '다만 표본이 적으면 쉽게 뒤집힙니다.',
    }),
  },
  {
    id: 'total-doubles', scope: 'total', tone: 'warn', source: `${SRC_SHERMAN} · ${SRC_APP}`,
    when: (ctx) => isNum(ctx.avgDoubles) && ctx.avgDoubles >= DOUBLES_WARN,
    build: (ctx) => ({
      title: '더블보기가 많습니다',
      body: `18홀 환산 더블보기 이상 ${ctx.avgDoubles!.toFixed(1)}홀. Sherman: 최저 스코어는 버디가 아니라 더블보기를 줄이는 데서 옵니다. ` +
            '원인은 셋 중 하나입니다. 무리한 선택(해저드 쪽 조준, 나무 사이 탈출), 그린을 놓치는 웨지샷, 실수 뒤의 감정. ' +
            '벌타와 3퍼트 수를 같이 보세요.',
    }),
  },

  /* ── 카테고리 공통 ── */
  {
    id: 'cat-rank1', scope: 'any-category', tone: 'warn', source: SRC_DEF,
    when: (ctx, d, cat) => cat !== null && d.ranked[0].cat === cat && ctx.byCat[cat] < 0,
    build: (ctx, d, cat) => ({
      title: '가장 큰 손실입니다',
      body: `4개 카테고리 중 손실이 가장 큽니다 (${signed(ctx.byCat[cat!])} vs Tour / 라운드). ` +
            `총 손실의 ${pctText(d.share[cat!] ?? 0)}.`,
    }),
  },
  {
    id: 'cat-close-gap', scope: 'any-category', tone: 'info', source: SRC_APP,
    when: (_ctx, d, cat) => {
      if (cat === null) return false;
      const idx = d.ranked.findIndex((r) => r.cat === cat);
      if (idx > 1) return false;
      const [a, b] = d.ranked;
      return a.value < 0 && Math.abs(a.value - b.value) < CLOSE_GAP;
    },
    build: (_ctx, d, cat) => {
      const other = d.ranked[0].cat === cat ? d.ranked[1] : d.ranked[0];
      const gap = Math.abs(d.ranked[0].value - d.ranked[1].value);
      return {
        title: `${SG_CATEGORY_LABELS[other.cat]}와 차이가 작습니다`,
        body: `1·2위 차이가 ${gap.toFixed(2)}타뿐입니다. 하나만 고르지 말고 둘 다 보세요. 표본이 적을수록 순위는 쉽게 바뀝니다.`,
      };
    },
  },
  {
    id: 'cat-positive', scope: 'any-category', tone: 'good', source: SRC_APP,
    when: (ctx, _d, cat) => cat !== null && ctx.byCat[cat] >= 0,
    build: (ctx, _d, cat) => ({
      title: '투어 평균 이상입니다',
      body: `${SG_CATEGORY_LABELS[cat!]}는 PGA Tour 평균보다 낫습니다 (${signed(ctx.byCat[cat!])}). ` +
            `원장 라운드가 ${MIN_ROUNDS_STABLE}개 미만이면 우연일 수 있습니다.`,
    }),
  },
  {
    id: 'cat-minor', scope: 'any-category', tone: 'info', source: SRC_APP,
    when: (ctx, d, cat) =>
      cat !== null && ctx.byCat[cat] < 0 && d.ranked[0].cat !== cat &&
      d.share[cat] !== null && d.share[cat]! < MINOR_SHARE,
    build: (_ctx, d, cat) => ({
      title: '지금은 우선순위가 아닙니다',
      body: `총 손실의 ${pctText(d.share[cat!]!)}뿐입니다. 여기서 얻을 게 적으니 상위 리크에 집중하세요.`,
    }),
  },

  /* ── 컨택 (티샷·어프로치·숏게임 공통) ── */
  {
    id: 'total-mishit-rate', scope: 'total', tone: 'warn', source: `${SRC_YOUNG} · ${SRC_APP}`,
    when: (ctx) => !!ctx.mishits && ctx.mishits.den >= STRIKE_MIN_SHOTS && ctx.mishits.hit / ctx.mishits.den >= MISHIT_RATE_WARN,
    build: (ctx) => ({
      title: `미스 컨택 ${ctx.mishits!.hit}/${ctx.mishits!.den} 샷 (${pctText(ctx.mishits!.hit / ctx.mishits!.den)})`,
      body: 'Young: 아마추어와 상급자의 가장 큰 차이는 스윙 모양이 아니라 컨택입니다. 8번 아이언이 1인치 뒤땅이면 −10yd, 2인치면 −36yd. ' +
            '넷 중 하나가 미스라면 코스 전략보다 접촉 훈련의 수익률이 높습니다. 카테고리 ⓘ에서 미스 샷의 SG를 따로 보세요.',
    }),
  },
  {
    id: 'cat-strike-driven', scope: 'any-category', tone: 'warn', source: `${SRC_YOUNG} · ${SRC_APP}`,
    when: (ctx, _d, cat) => {
      if (cat === null || cat === 'putt' || ctx.byCat[cat] >= 0) return false;
      const st = strikeOf(ctx, cat);
      return !!st && st.den >= STRIKE_MIN_SHOTS && st.missLossShare !== null && st.missLossShare >= STRIKE_LOSS_SHARE_HIGH;
    },
    build: (ctx, _d, cat) => {
      const st = strikeOf(ctx, cat!)!;
      return {
        title: `미스 샷이 손실의 ${pctText(st.missLossShare!)}`,
        body: `컨택 기록 ${st.den}샷 중 미스 ${st.missShots}개(${pctText(st.missRate)}). ` +
              `샷당 SG는 정상 ${st.okAvg !== null ? signed(st.okAvg) : 'N/A'} vs 미스 ${st.missAvg !== null ? signed(st.missAvg) : 'N/A'}. ` +
              '타점 문제입니다. Young: 타점이 한쪽으로 치우치면 일부러 반대쪽을 치는 차등 연습, 흩어지면 라이·클럽을 바꿔 가며 치는 변동 연습이 맞습니다. ' +
              '클럽 선택을 바꿔도 이 손실은 안 줄어듭니다.',
      };
    },
  },
  {
    id: 'cat-decision-driven', scope: 'any-category', tone: 'info', source: `${SRC_PG} · ${SRC_APP}`,
    when: (ctx, _d, cat) => {
      if (cat === null || cat === 'putt' || ctx.byCat[cat] >= 0) return false;
      const st = strikeOf(ctx, cat);
      return !!st && st.den >= STRIKE_MIN_SHOTS && st.missLossShare !== null && st.missLossShare <= STRIKE_LOSS_SHARE_LOW;
    },
    build: (ctx, _d, cat) => {
      const st = strikeOf(ctx, cat!)!;
      return {
        title: '잘 맞은 샷에서도 잃습니다',
        body: `미스 샷은 손실의 ${pctText(st.missLossShare!)}뿐이고 정상 컨택 ${st.okShots}샷의 샷당 SG가 ${st.okAvg !== null ? signed(st.okAvg) : 'N/A'}입니다. ` +
              '컨택보다 타깃·클럽 선택 문제입니다. Sherman식 처방(트러블 반대쪽 조준, 그린 중앙, 뒤쪽 야디지)이 접촉 훈련보다 먼저입니다.',
      };
    },
  },
  {
    id: 'cat-strike-few', scope: 'any-category', tone: 'info', source: SRC_APP,
    when: (ctx, _d, cat) => {
      if (cat === null || cat === 'putt' || ctx.byCat[cat] >= 0 || !ctx.strike) return false;
      const st = strikeOf(ctx, cat);
      return st === null || st.den < STRIKE_MIN_SHOTS;
    },
    build: (ctx, _d, cat) => {
      const st = strikeOf(ctx, cat!);
      return {
        title: '컨택 기록이 아직 적습니다',
        body: `컨택이 기록된 샷 ${st ? st.den : 0}개. ${STRIKE_MIN_SHOTS}샷부터 미스 샷과 정상 샷의 SG를 갈라 타점 문제인지 판단 문제인지 알려 드립니다. ` +
              '원장에서 미스 컨택은 샷 줄의 "미스"를 누르면 됩니다.',
      };
    },
  },

  /* ── 티샷 ── */
  {
    id: 'tee-penalties', scope: 'tee', tone: 'warn', source: `${SRC_DEF} · ${SRC_SHERMAN}`,
    when: (ctx) => isNum(ctx.avgPenalties) && ctx.avgPenalties >= 1,
    build: (ctx) => ({
      title: '벌타가 티샷 손실을 키웁니다',
      body: `라운드당 벌타 ${ctx.avgPenalties!.toFixed(1)}개. 벌타 하나는 1타에 더해 위치 손실까지 얹힙니다. ` +
            'Sherman: 티샷의 목표는 페어웨이가 아니라 인플레이입니다. 해저드·OB 반대쪽을 조준하고 필요하면 클럽을 내리세요.',
    }),
  },
  {
    id: 'tee-fir-low', scope: 'tee', tone: 'info', source: `${SRC_TABLE9} · ${SRC_SHERMAN}`,
    when: (ctx) => { const p = pct(ctx.fir); return p !== null && p < 0.4; },
    build: (ctx) => ({
      title: `페어웨이 적중률 ${pctText(pct(ctx.fir)!)}`,
      body: '러프 자체는 페어웨이보다 약 0.2~0.3타 비쌀 뿐입니다 (Broadie 100yd: FW 2.80 vs RO 3.02 / Sherman 인용 러프 −0.3). ' +
            '나무는 −1.1, 페어웨이 벙커는 −1.4로 벌타에 가깝습니다. 티샷 손실이 크다면 러프보다 트러블·벌타가 원인일 가능성이 큽니다.',
    }),
  },
  {
    id: 'tee-fir-ok-but-loss', scope: 'tee', tone: 'info', source: SRC_PG,
    when: (ctx) => { const p = pct(ctx.fir); return p !== null && p >= 0.5 && ctx.byCat.tee < 0 && (!isNum(ctx.avgPenalties) || ctx.avgPenalties < 1); },
    build: (ctx) => ({
      title: `페어웨이 ${pctText(pct(ctx.fir)!)}인데 티샷 SG가 음수입니다`,
      body: '벌타도 적고 페어웨이도 잘 맞히는데 잃는다면 거리입니다. Sherman: 페어웨이 75%에 200yd보다 55%에 더 멀리 보내는 쪽이 낫습니다. ' +
            '남은 거리 버킷이 자주 150m 이상이면 티샷 거리를 늘리는 쪽이 정확도보다 효율적입니다.',
    }),
  },

  {
    id: 'tee-club-driver-better', scope: 'tee', tone: 'good', source: `${SRC_PG} · ${SRC_APP}`,
    when: (ctx) => { const t = teeClubOf(ctx); return !!t && t.gap !== null && t.gap >= TEE_CLUB_GAP; },
    build: (ctx) => {
      const t = teeClubOf(ctx)!;
      return {
        title: `드라이버가 샷당 ${t.gap!.toFixed(2)}타 낫습니다`,
        body: `드라이버 ${t.driverShots}샷 샷당 ${signed(t.driverAvg!)} vs 끊어감(우드·유틸·아이언) ${t.otherShots}샷 샷당 ${signed(t.otherAvg!)}. ` +
              '끊어가서 얻는 정확도가 거리 손실을 메우지 못하고 있습니다. Sherman: 페어웨이 75%에 200yd보다 55%에 더 멀리 보내는 쪽이 낫습니다. ' +
              'OB·해저드가 분명한 홀이 아니면 드라이버를 잡으세요.',
      };
    },
  },
  {
    id: 'tee-club-other-better', scope: 'tee', tone: 'info', source: `${SRC_SHERMAN} · ${SRC_APP}`,
    when: (ctx) => { const t = teeClubOf(ctx); return !!t && t.gap !== null && t.gap <= -TEE_CLUB_GAP; },
    build: (ctx) => {
      const t = teeClubOf(ctx)!;
      return {
        title: `끊어간 티샷이 샷당 ${(-t.gap!).toFixed(2)}타 낫습니다`,
        body: `끊어감(우드·유틸·아이언) ${t.otherShots}샷 샷당 ${signed(t.otherAvg!)} vs 드라이버 ${t.driverShots}샷 샷당 ${signed(t.driverAvg!)}. ` +
              'SG는 홀 길이를 반영하므로 거리 차이는 이미 계산에 들어가 있습니다. 그래도 드라이버에서 잃는다면 벌타·트러블 비용입니다. ' +
              '다만 끊어가는 홀은 대개 좁거나 위험한 홀이라 조건이 같지 않습니다. 트러블이 있는 홀부터 드라이버 대신 한 클럽 짧게 잡아 보세요.',
      };
    },
  },
  {
    id: 'tee-club-similar', scope: 'tee', tone: 'info', source: SRC_APP,
    when: (ctx) => { const t = teeClubOf(ctx); return !!t && t.gap !== null && Math.abs(t.gap) < TEE_CLUB_GAP && ctx.byCat.tee < 0; },
    build: (ctx) => {
      const t = teeClubOf(ctx)!;
      return {
        title: '드라이버와 끊어가기 차이가 작습니다',
        body: `드라이버 샷당 ${signed(t.driverAvg!)} vs 우드·유틸·아이언 ${signed(t.otherAvg!)}. ` +
              '클럽 선택보다 조준·컨택 쪽에서 티샷 손실을 찾으세요.',
      };
    },
  },
  {
    id: 'tee-club-few', scope: 'tee', tone: 'info', source: SRC_APP,
    when: (ctx) => { const t = teeClubOf(ctx); return !!t && !t.comparable && ctx.byCat.tee < 0; },
    build: (ctx) => {
      const t = teeClubOf(ctx)!;
      return {
        title: '드라이버 비교에 티샷이 부족합니다',
        body: `드라이버 ${t.driverShots}샷, 끊어감(우드·유틸·아이언) ${t.otherShots}샷. 각각 ${TEE_CLUB_MIN_SHOTS}샷부터 샷당 SG를 비교해 ` +
              '드라이버를 잡는 게 나은지 알려 드립니다. 원장 첫 샷 줄의 "드라이버"를 눌러 끊어간 티샷을 "끊어감"으로 바꾸세요.',
      };
    },
  },

  /* ── 어프로치 ── */
  {
    id: 'approach-gir-low', scope: 'approach', tone: 'info', source: `${SRC_RICCIO} · ${SRC_PG}`,
    when: (ctx) => { const p = pct(ctx.gir); return p !== null && p < 0.3 && !!ctx.riccio; },
    build: (ctx) => ({
      title: `GIR ${pctText(pct(ctx.gir)!)}`,
      body: `18홀 환산 GIR ${ctx.riccio!.gir18.toFixed(1)}홀. Riccio 기대 스코어는 ${ctx.riccio!.expScore.toFixed(1)}이고 GIR 1홀에 약 2타입니다. ` +
            'Sherman: 대부분의 아마추어가 GIR 30% 미만이고, 그린 미스는 대부분 짧은 쪽입니다. ' +
            '그린 중앙을 조준하고 뒤쪽 거리로 클럽을 고르는 것만으로 라운드당 그린 2~3개가 늘어난다고 봅니다.',
    }),
  },
  {
    id: 'approach-gir-ok-but-loss', scope: 'approach', tone: 'info', source: SRC_PG,
    when: (ctx) => { const p = pct(ctx.gir); return p !== null && p >= 0.4 && ctx.byCat.approach < 0; },
    build: (ctx) => ({
      title: `GIR ${pctText(pct(ctx.gir)!)}인데 어프로치 SG가 음수입니다`,
      body: '그린은 맞히는데 잃는다면 첫 퍼트 거리입니다. 투어도 100~125yd에서 평균 약 6m를 남기니 붙이기를 기대하지 마세요. ' +
            '대신 그린 미스가 생겼을 때 짧은 쪽·벙커 쪽이었는지 확인하세요. 그 홀들이 손실의 대부분입니다.',
    }),
  },

  /* ── 숏게임 ── */
  {
    id: 'short-scramble-low', scope: 'short', tone: 'info', source: `${SRC_PUTT} · ${SRC_PG}`,
    when: (ctx) => { const p = pct(ctx.scramble); return p !== null && p < 0.3; },
    build: (ctx) => ({
      title: `업앤다운 ${pctText(pct(ctx.scramble)!)}`,
      body: '업앤다운 실패는 숏게임 SG와 퍼팅 SG에 나뉘어 잡힙니다. 첫 퍼트를 2m 안에 남기면 투어 기준 홀아웃 기대치가 1.3타 안쪽입니다 (6ft 1.34). ' +
            'Sherman: 웨지는 붙이는 게 아니라 거의 매번 그린에 올리는 게 목표입니다. 플롭 대신 한 가지 낮은 샷을 만드세요.',
    }),
  },
  {
    id: 'short-with-low-gir', scope: 'short', tone: 'info', source: SRC_PG,
    when: (ctx) => { const p = pct(ctx.gir); return p !== null && p < 0.3 && ctx.byCat.short < 0; },
    build: (ctx) => ({
      title: '숏게임 기회가 많은 GIR입니다',
      body: `GIR ${pctText(pct(ctx.gir)!)}이면 라운드 절반 이상이 웨지 + 2퍼트로 파를 지켜야 하는 홀입니다. ` +
            'Sherman은 이 상황을 더블보기의 주원인으로 봅니다. 여기서 잃는 타수는 어프로치 개선과 웨지 연습 어느 쪽으로도 줄일 수 있습니다.',
    }),
  },

  /* ── 퍼팅 ── */
  {
    id: 'putt-three-putts', scope: 'putt', tone: 'warn', source: `${SRC_PG} · ${SRC_APP}`,
    when: (ctx) => { const p = pct(ctx.threePutts); return p !== null && p >= THREE_PUTT_WARN; },
    build: (ctx) => ({
      title: `3퍼트 ${ctx.threePutts!.hit}/${ctx.threePutts!.den} 홀 (${pctText(pct(ctx.threePutts)!)})`,
      body: '3퍼트 하나는 투어 대비 거의 −1입니다. Sherman: 퍼팅은 라인보다 스피드이고, 스코어를 줄이는 가장 현실적인 퍼팅 목표는 3퍼트를 없애는 것입니다. ' +
            '롱퍼트를 1m 안에 붙이는 연습이 3m 퍼트 성공률 연습보다 먼저입니다.',
    }),
  },
  {
    id: 'putt-riccio-over', scope: 'putt', tone: 'warn', source: SRC_RICCIO,
    when: (ctx) =>
      !!ctx.riccio && ctx.riccio.putts18 !== null && ctx.riccio.putts18 - ctx.riccio.expPutts > RICCIO_PUTT_GAP,
    build: (ctx) => {
      const r = ctx.riccio!;
      const gap = r.putts18! - r.expPutts;
      return {
        title: 'GIR 대비 퍼트가 많습니다',
        body: `18홀 환산 퍼트 ${r.putts18!.toFixed(1)} vs Riccio 기대 ${r.expPutts.toFixed(1)} (${signed(gap, 1)}). ` +
              '퍼팅 손실이 표본 노이즈가 아니라 실제일 가능성이 큽니다.',
      };
    },
  },
  {
    id: 'putt-riccio-ok-but-loss', scope: 'putt', tone: 'info', source: SRC_RICCIO,
    when: (ctx) =>
      ctx.byCat.putt < 0 && !!ctx.riccio && ctx.riccio.putts18 !== null && ctx.riccio.putts18 - ctx.riccio.expPutts <= 0,
    build: (ctx) => ({
      title: '퍼트 수는 GIR에 맞습니다',
      body: `퍼트 수는 Riccio 기대(${ctx.riccio!.expPutts.toFixed(1)}) 이하인데 퍼팅 SG는 음수입니다. ` +
            '퍼팅 SG는 첫 퍼트 거리 기준이라 롱퍼트를 많이 남기면 퍼트 수가 정상이어도 손실로 잡힙니다. ' +
            '원인은 어프로치·숏게임 쪽일 수 있습니다.',
    }),
  },
  {
    id: 'putt-low-gir-flatters', scope: 'putt', tone: 'info', source: SRC_DEF,
    when: (ctx) => { const p = pct(ctx.gir); return ctx.byCat.putt >= 0 && p !== null && p < 0.3; },
    build: () => ({
      title: '낮은 GIR이 퍼팅 SG를 좋게 보이게 합니다',
      body: '그린을 놓친 홀은 첫 퍼트가 짧습니다. 첫 퍼트가 짧으면 투어 기대치도 낮아져 퍼팅 SG가 유리하게 나옵니다. ' +
            '퍼팅이 강점이라 단정하기 전에 숏게임 SG와 같이 보세요.',
    }),
  },
  {
    id: 'putt-expectation', scope: 'putt', tone: 'info', source: SRC_PG,
    when: (ctx) => ctx.byCat.putt < 0 && (pct(ctx.threePutts) ?? 0) < THREE_PUTT_WARN,
    build: () => ({
      title: '3퍼트는 적습니다. 기대치를 점검하세요',
      body: '3퍼트가 적은데 퍼팅 SG가 음수라면 2~5m 성공률 차이입니다. 투어도 5~10ft(1.5~3m)에서 57%, 10~15ft에서 33%만 넣습니다. ' +
            '3m 퍼트를 놓치는 건 정상이니, 1~2m를 확실히 넣는 쪽에 연습을 집중하세요.',
    }),
  },
];

/** scope에 맞는 상황 해설. 'total'이면 전체 규칙, 카테고리면 공통 + 그 카테고리 규칙. 순서는 RULES 정의 순. */
export function selectInsights(ctx: InsightContext, scope: InsightScope): Insight[] {
  const d = derive(ctx);
  const cat: SgCategory | null = scope === 'total' ? null : scope;
  const out: Insight[] = [];
  for (const rule of RULES) {
    const applies =
      rule.scope === scope ||
      (rule.scope === 'any-category' && cat !== null);
    if (!applies) continue;
    if (!rule.when(ctx, d, cat)) continue;
    const { title, body } = rule.build(ctx, d, cat);
    out.push({ id: rule.id, scope, tone: rule.tone, title, body, source: rule.source });
  }
  return out;
}

/** 해설에 쓰인 출처를 중복 없이 모은다 (화면 하단 표기용). */
export function insightSources(guideSource: string, insights: Insight[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [guideSource, ...insights.map((i) => i.source)]) {
    for (const part of s.split(' · ')) {
      if (!seen.has(part)) { seen.add(part); out.push(part); }
    }
  }
  return out;
}
