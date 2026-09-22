import { test, expect } from '@playwright/test';
import {
  selectInsights, insightSources, SG_GUIDE, SG_TOTAL_GUIDE,
  MIN_ROUNDS_STABLE, DOUBLES_WARN, type InsightContext,
} from '../../src/lib/insights';
import { SG_CATEGORIES, emptySgByStrike, type SgByStrike } from '../../src/lib/sg';
import { riccioEstimate } from '../../src/lib/stats';

const FORBIDDEN = /eSG|Estimated|Baseline|핸디/;

/** 전형적인 90타 골퍼: 롱게임 손실 큼, 라운드 8개, 원장 완전 */
function typical(over: Partial<InsightContext> = {}): InsightContext {
  return {
    byCat: { tee: -3.0, approach: -5.0, short: -2.0, putt: -1.5 },
    total: -11.5,
    rounds: 8,
    holes: 8 * 18,
    fir: { hit: 40, den: 112 },
    gir: { hit: 30, den: 144 },
    scramble: { hit: 30, den: 114 },
    threePutts: { hit: 10, den: 144 },
    avgPutts: 34,
    avgPenalties: 0.5,
    avgDoubles: 2,
    riccio: riccioEstimate({ hit: 30, den: 144 }, { total: 34 * 8, holes: 144 }),
    ...over,
  };
}

const ids = (ctx: InsightContext, scope: Parameters<typeof selectInsights>[1]) =>
  selectInsights(ctx, scope).map((i) => i.id);

test.describe('고정 해설', () => {
  test('카테고리 4개 모두 what/reading/action/source가 있고 금지 표기가 없다', () => {
    for (const c of SG_CATEGORIES) {
      const g = SG_GUIDE[c];
      for (const v of [g.what, g.reading, g.action, g.source]) {
        expect(v.length).toBeGreaterThan(10);
        expect(v).not.toMatch(FORBIDDEN);
      }
    }
    expect(SG_TOTAL_GUIDE.reading).toContain('Broadie');
    expect(SG_TOTAL_GUIDE.reading).toContain('Sherman');
  });
});

test.describe('selectInsights — 전체', () => {
  test('전형적 분포 + 충분한 표본이면 long-typical만', () => {
    const got = ids(typical(), 'total');
    expect(got).toContain('total-long-typical');
    expect(got).not.toContain('total-few-rounds');
    expect(got).not.toContain('total-partial-rounds');
    expect(got).not.toContain('total-short-heavy');
    expect(got).not.toContain('total-doubles');
  });
  test('라운드가 적으면 표본 경고', () => {
    expect(ids(typical({ rounds: MIN_ROUNDS_STABLE - 1, holes: (MIN_ROUNDS_STABLE - 1) * 18 }), 'total'))
      .toContain('total-few-rounds');
  });
  test('라운드당 원장 홀이 적으면 환산 배율 경고에 배율 숫자가 들어간다', () => {
    const got = selectInsights(typical({ rounds: 8, holes: 8 * 6 }), 'total');
    const w = got.find((i) => i.id === 'total-partial-rounds');
    expect(w).toBeTruthy();
    expect(w!.body).toContain('6.0홀');
    expect(w!.body).toContain('3.0배');
  });
  test('숏게임+퍼팅 비중이 크면 short-heavy (Sherman 출처 동반)', () => {
    const got = selectInsights(typical({ byCat: { tee: -1, approach: -1, short: -3, putt: -3 }, total: -8 }), 'total');
    const w = got.find((i) => i.id === 'total-short-heavy');
    expect(w).toBeTruthy();
    expect(w!.source).toContain('Sherman');
    expect(got.map((i) => i.id)).not.toContain('total-long-typical');
  });
  test('총합이 양수면 good, 손실 분포 규칙은 안 나온다', () => {
    const got = ids(typical({ byCat: { tee: 1, approach: 0.5, short: 0.2, putt: 0.1 }, total: 1.8 }), 'total');
    expect(got).toContain('total-positive');
    expect(got).not.toContain('total-long-typical');
    expect(got).not.toContain('total-short-heavy');
  });
  test('더블보기가 많으면 Sherman 더블보기 경고', () => {
    const got = selectInsights(typical({ avgDoubles: DOUBLES_WARN }), 'total');
    const w = got.find((i) => i.id === 'total-doubles');
    expect(w).toBeTruthy();
    expect(w!.body).toContain('더블보기');
    expect(ids(typical({ avgDoubles: null }), 'total')).not.toContain('total-doubles');
  });
});

test.describe('selectInsights — 카테고리 공통', () => {
  test('가장 큰 손실 카테고리에만 rank1, 비중 % 포함', () => {
    const got = selectInsights(typical(), 'approach');
    const r = got.find((i) => i.id === 'cat-rank1');
    expect(r).toBeTruthy();
    expect(r!.body).toContain('-5.00 vs Tour');
    expect(r!.body).toMatch(/총 손실의 43%/);   // 5 / 11.5
    expect(ids(typical(), 'tee')).not.toContain('cat-rank1');
  });
  test('1·2위 차이가 0.5 미만이면 둘 다에 close-gap', () => {
    const ctx = typical({ byCat: { tee: -4.8, approach: -5.0, short: -1, putt: -0.7 }, total: -11.5 });
    expect(ids(ctx, 'approach')).toContain('cat-close-gap');
    expect(ids(ctx, 'tee')).toContain('cat-close-gap');
    expect(ids(ctx, 'short')).not.toContain('cat-close-gap');
    const t = selectInsights(ctx, 'tee').find((i) => i.id === 'cat-close-gap')!;
    expect(t.title).toContain('Approach');
  });
  test('양수 카테고리는 positive, 손실 비중 작으면 minor', () => {
    const ctx = typical({ byCat: { tee: 0.3, approach: -6, short: -0.5, putt: -3 }, total: -9.2 });
    expect(ids(ctx, 'tee')).toContain('cat-positive');
    expect(ids(ctx, 'short')).toContain('cat-minor');   // 0.5 / 9.5 ≈ 5%
    expect(ids(ctx, 'putt')).not.toContain('cat-minor');
  });
});

test.describe('selectInsights — 카테고리별 교차 확인', () => {
  test('tee: 벌타 1개 이상이면 벌타 경고, FIR 40% 미만이면 fir-low', () => {
    const got = ids(typical({ avgPenalties: 1.2, fir: { hit: 30, den: 112 } }), 'tee');
    expect(got).toContain('tee-penalties');
    expect(got).toContain('tee-fir-low');
    expect(got).not.toContain('tee-fir-ok-but-loss');
  });
  test('tee: FIR 50% 이상 + 벌타 적음 + 티샷 음수면 거리 문제 (Sherman)', () => {
    const got = selectInsights(typical({ avgPenalties: 0.3, fir: { hit: 60, den: 112 } }), 'tee');
    const w = got.find((i) => i.id === 'tee-fir-ok-but-loss');
    expect(w).toBeTruthy();
    expect(w!.body).toContain('거리');
  });
  test('tee: FIR 분모가 0이면 FIR 규칙은 아무것도 안 나온다 (N/A)', () => {
    const got = ids(typical({ fir: { hit: 0, den: 0 } }), 'tee');
    expect(got).not.toContain('tee-fir-low');
    expect(got).not.toContain('tee-fir-ok-but-loss');
  });
  test('approach: GIR 30% 미만이면 Riccio 기대 스코어와 GIR 18홀 환산 포함', () => {
    const got = selectInsights(typical(), 'approach');
    const w = got.find((i) => i.id === 'approach-gir-low')!;
    expect(w).toBeTruthy();
    expect(w.body).toContain('3.8홀');       // 30/144*18 = 3.75
    expect(w.body).toContain('87.5');        // 95 − 2×3.75
    expect(w.body).toContain('그린 중앙');
  });
  test('approach: GIR 40% 이상인데 음수면 첫 퍼트 거리 해설', () => {
    const got = ids(typical({ gir: { hit: 60, den: 144 } }), 'approach');
    expect(got).toContain('approach-gir-ok-but-loss');
    expect(got).not.toContain('approach-gir-low');
  });
  test('short: 업앤다운 30% 미만이면 scramble-low, GIR 낮으면 기회 해설', () => {
    const got = ids(typical(), 'short');
    expect(got).toContain('short-scramble-low');
    expect(got).toContain('short-with-low-gir');
  });
  test('putt: 3퍼트 15% 이상이면 3퍼트 경고, 아니면 기대치 해설', () => {
    const many = selectInsights(typical({ threePutts: { hit: 30, den: 144 } }), 'putt');
    const w = many.find((i) => i.id === 'putt-three-putts')!;
    expect(w).toBeTruthy();
    expect(w.title).toContain('30/144');
    expect(many.map((i) => i.id)).not.toContain('putt-expectation');

    const few = ids(typical({ threePutts: { hit: 5, den: 144 } }), 'putt');
    expect(few).toContain('putt-expectation');
    expect(few).not.toContain('putt-three-putts');
  });
  test('putt: Riccio 기대보다 퍼트가 1개 넘게 많으면 over, 이하면 ok-but-loss', () => {
    // gir 30/144 → gir18 3.75 → expPutts 34.5
    const over = ids(typical({ riccio: riccioEstimate({ hit: 30, den: 144 }, { total: 37 * 8, holes: 144 }) }), 'putt');
    expect(over).toContain('putt-riccio-over');
    expect(over).not.toContain('putt-riccio-ok-but-loss');
    const ok = ids(typical({ riccio: riccioEstimate({ hit: 30, den: 144 }, { total: 33 * 8, holes: 144 }) }), 'putt');
    expect(ok).toContain('putt-riccio-ok-but-loss');
    expect(ok).not.toContain('putt-riccio-over');
  });
  test('putt: 양수 + GIR 낮으면 "GIR이 유리하게 보이게 한다"', () => {
    const ctx = typical({ byCat: { tee: -3, approach: -5, short: -2, putt: 0.4 }, total: -9.6 });
    const got = ids(ctx, 'putt');
    expect(got).toContain('putt-low-gir-flatters');
    expect(got).toContain('cat-positive');
    expect(got).not.toContain('putt-expectation');
  });
});

/** 컨택 분해 헬퍼: 카테고리 하나에 ok/miss 샷 수와 SG 합을 넣는다 */
function strikeFor(cat: 'tee' | 'approach' | 'short', ok: { shots: number; sg: number }, miss: { shots: number; sg: number }): SgByStrike {
  const st = emptySgByStrike();
  st.ok.shots[cat] = ok.shots; st.ok.sg[cat] = ok.sg;
  st.miss.shots[cat] = miss.shots; st.miss.sg[cat] = miss.sg;
  return st;
}

test.describe('selectInsights — 컨택 (Young)', () => {
  test('컨택 정보가 없으면 컨택 규칙은 전혀 안 나온다', () => {
    const got = ids(typical(), 'approach');
    expect(got.filter((id) => id.includes('strike') || id.includes('decision') || id.includes('mishit'))).toEqual([]);
  });
  test('미스 샷이 손실의 60% 이상이면 타점 문제 (샷당 SG 비교 포함)', () => {
    const ctx = typical({ strike: strikeFor('approach', { shots: 30, sg: -3 }, { shots: 10, sg: -9 }) });
    const got = selectInsights(ctx, 'approach');
    const w = got.find((i) => i.id === 'cat-strike-driven')!;
    expect(w).toBeTruthy();
    expect(w.title).toContain('75%');
    expect(w.body).toContain('미스 10개(25%)');
    expect(w.body).toContain('정상 -0.10 vs 미스 -0.90');
    expect(w.source).toContain('Young');
    expect(got.map((i) => i.id)).not.toContain('cat-decision-driven');
  });
  test('미스 샷이 손실의 30% 이하면 판단 문제 (Sherman)', () => {
    const ctx = typical({ strike: strikeFor('tee', { shots: 40, sg: -8 }, { shots: 4, sg: -2 }) });
    const got = selectInsights(ctx, 'tee');
    const w = got.find((i) => i.id === 'cat-decision-driven')!;
    expect(w).toBeTruthy();
    expect(w.body).toContain('20%');
    expect(w.source).toContain('Sherman');
    expect(got.map((i) => i.id)).not.toContain('cat-strike-driven');
  });
  test('30~60% 사이면 둘 다 안 나온다', () => {
    const ctx = typical({ strike: strikeFor('short', { shots: 20, sg: -2 }, { shots: 10, sg: -2 }) });
    const got = ids(ctx, 'short');
    expect(got).not.toContain('cat-strike-driven');
    expect(got).not.toContain('cat-decision-driven');
    expect(got).not.toContain('cat-strike-few');
  });
  test('기록 샷이 10개 미만이면 "아직 적다" 안내만', () => {
    const ctx = typical({ strike: strikeFor('approach', { shots: 5, sg: -1 }, { shots: 3, sg: -3 }) });
    const got = selectInsights(ctx, 'approach');
    expect(got.map((i) => i.id)).toContain('cat-strike-few');
    expect(got.find((i) => i.id === 'cat-strike-few')!.body).toContain('8개');
    expect(got.map((i) => i.id)).not.toContain('cat-strike-driven');
  });
  test('퍼팅과 양수 카테고리엔 컨택 규칙 없음', () => {
    const ctx = typical({ strike: strikeFor('tee', { shots: 30, sg: 1 }, { shots: 10, sg: -1 }), byCat: { tee: 0.5, approach: -5, short: -2, putt: -1.5 }, total: -8 });
    expect(ids(ctx, 'putt').some((id) => id.startsWith('cat-strike') || id === 'cat-decision-driven')).toBe(false);
    expect(ids(ctx, 'tee').some((id) => id.startsWith('cat-strike') || id === 'cat-decision-driven')).toBe(false);
  });
  test('전체 미스율 25% 이상이면 total 경고 (기록 10샷 이상)', () => {
    expect(ids(typical({ mishits: { hit: 12, den: 40 } }), 'total')).toContain('total-mishit-rate');
    expect(ids(typical({ mishits: { hit: 3, den: 8 } }), 'total')).not.toContain('total-mishit-rate');
    expect(ids(typical({ mishits: { hit: 5, den: 40 } }), 'total')).not.toContain('total-mishit-rate');
    expect(ids(typical(), 'total')).not.toContain('total-mishit-rate');
  });
});

test.describe('출력 규칙', () => {
  test('모든 해설 문구에 금지 표기가 없고 출처가 있다', () => {
    const variants: InsightContext[] = [
      typical(),
      typical({ rounds: 2, holes: 20, avgPenalties: 2, avgDoubles: 5, threePutts: { hit: 40, den: 144 } }),
      typical({ byCat: { tee: 0.5, approach: 0.2, short: 0.1, putt: 0.3 }, total: 1.1, gir: { hit: 20, den: 144 } }),
      typical({ byCat: { tee: -1, approach: -1, short: -3, putt: -3 }, total: -8, gir: { hit: 70, den: 144 }, fir: { hit: 70, den: 112 } }),
      typical({ mishits: { hit: 15, den: 40 }, strike: strikeFor('approach', { shots: 30, sg: -3 }, { shots: 10, sg: -9 }) }),
      typical({ strike: strikeFor('tee', { shots: 40, sg: -8 }, { shots: 4, sg: -2 }) }),
    ];
    for (const ctx of variants) {
      for (const scope of ['total', ...SG_CATEGORIES] as const) {
        for (const i of selectInsights(ctx, scope)) {
          expect(i.title + i.body).not.toMatch(FORBIDDEN);
          expect(i.source.length).toBeGreaterThan(3);
          expect(i.scope).toBe(scope);
        }
      }
    }
  });
  test('insightSources는 " · "로 나뉜 출처를 중복 없이 합친다', () => {
    const got = insightSources('A · B', [
      { id: 'x', scope: 'total', tone: 'info', title: '', body: '', source: 'B · C' },
      { id: 'y', scope: 'total', tone: 'info', title: '', body: '', source: 'A' },
    ]);
    expect(got).toEqual(['A', 'B', 'C']);
  });
  test('선택 필드가 전부 없어도 동작한다', () => {
    const ctx: InsightContext = { byCat: { tee: -2, approach: -3, short: -1, putt: -1 }, total: -7, rounds: 6, holes: 108 };
    for (const scope of ['total', ...SG_CATEGORIES] as const) {
      expect(() => selectInsights(ctx, scope)).not.toThrow();
    }
    expect(ids(ctx, 'approach')).toEqual(['cat-rank1']);
  });
});
