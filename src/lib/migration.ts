import type {
  ShapeVal, StartLineVal, CurveVal,
  TeeRoutine, StgShot, PuttCard,
} from './types';

/**
 * Convert old single ShapeVal to {startLine, curve} pair.
 */
export function migrateShape(shape: ShapeVal | null | undefined): {
  startLine: StartLineVal | null;
  curve: CurveVal | null;
} {
  if (!shape) return { startLine: null, curve: null };
  const map: Record<ShapeVal, { startLine: StartLineVal; curve: CurveVal }> = {
    'duck-hook': { startLine: 'straight', curve: 'duck-hook' },
    hook:        { startLine: 'straight', curve: 'hook' },
    pull:        { startLine: 'pull',     curve: 'straight' },
    draw:        { startLine: 'straight', curve: 'draw' },
    straight:    { startLine: 'straight', curve: 'straight' },
    fade:        { startLine: 'straight', curve: 'fade' },
    push:        { startLine: 'push',     curve: 'straight' },
    slice:       { startLine: 'straight', curve: 'slice' },
    shank:       { startLine: 'straight', curve: 'shank' },
  };
  return map[shape] ?? { startLine: null, curve: null };
}

/**
 * Convert old lieSlope (string | null) to string[] | null.
 */
export function migrateSlope(val: unknown): string[] | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') return [val];
  return null;
}

/**
 * Convert old preSpeed string to numeric.
 */
export function migratePreSpeed(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const map: Record<string, number> = { slow: 2.3, medium: 3.0, fast: 3.7 };
    return map[val] ?? null;
  }
  return null;
}

/**
 * Migrate a raw TeeRoutine from DB (may have old shape fields).
 */
export function migrateTeeRoutine(raw: Record<string, unknown>): TeeRoutine {
  const r = raw as unknown as TeeRoutine & { targetShape?: ShapeVal; resultShape?: ShapeVal };

  // Migrate targetShape → targetStartLine + targetCurve if new fields missing
  let targetStartLine = r.targetStartLine ?? null;
  let targetCurve = r.targetCurve ?? null;
  if (targetStartLine === null && targetCurve === null && r.targetShape) {
    const m = migrateShape(r.targetShape);
    targetStartLine = m.startLine;
    targetCurve = m.curve;
  }

  let resultStartLine = r.resultStartLine ?? null;
  let resultCurve = r.resultCurve ?? null;
  if (resultStartLine === null && resultCurve === null && r.resultShape) {
    const m = migrateShape(r.resultShape);
    resultStartLine = m.startLine;
    resultCurve = m.curve;
  }

  return {
    windStr: r.windStr ?? null,
    windDir: r.windDir ?? null,
    targetTraj: r.targetTraj ?? null,
    targetStartLine,
    targetCurve,
    landing: r.landing ?? null,
    actualCarry: r.actualCarry ?? null,
    resultTraj: r.resultTraj ?? null,
    resultStartLine,
    resultCurve,
    feel: r.feel ?? null,
    commit: r.commit ?? null,
    learnType: r.learnType ?? null,
    learnNote: r.learnNote ?? null,
  };
}

/**
 * Migrate a raw StgShot from DB.
 */
export function migrateStgShot(raw: Record<string, unknown>): StgShot {
  const s = raw as unknown as StgShot & { targetShape?: ShapeVal; resShape?: ShapeVal };

  let targetStartLine = s.targetStartLine ?? null;
  let targetCurve = s.targetCurve ?? null;
  if (targetStartLine === null && targetCurve === null && s.targetShape) {
    const m = migrateShape(s.targetShape);
    targetStartLine = m.startLine;
    targetCurve = m.curve;
  }

  let resStartLine = s.resStartLine ?? null;
  let resCurve = s.resCurve ?? null;
  if (resStartLine === null && resCurve === null && s.resShape) {
    const m = migrateShape(s.resShape);
    resStartLine = m.startLine;
    resCurve = m.curve;
  }

  return {
    intent: s.intent,
    dist: s.dist ?? '',
    club: s.club ?? '',
    windStr: s.windStr ?? null,
    windDir: s.windDir ?? null,
    lieQuality: s.lieQuality ?? null,
    lieBall: s.lieBall ?? null,
    lieSlope: migrateSlope(s.lieSlope),
    lieStance: s.lieStance ?? null,
    argType: s.argType ?? null,
    targetTraj: s.targetTraj ?? null,
    targetStartLine,
    targetCurve,
    result: s.result ?? null,
    resTraj: s.resTraj ?? null,
    resStartLine,
    resCurve,
    feel: s.feel ?? null,
    commit: s.commit ?? null,
    learnType: s.learnType ?? null,
    note: s.note ?? null,
  };
}

/**
 * Migrate a raw PuttCard from DB.
 */
export function migratePuttCard(raw: Record<string, unknown>): PuttCard {
  const p = raw as unknown as PuttCard & { preSpeed?: unknown };

  return {
    dist: p.dist ?? null,
    slope: p.slope ?? null,
    break: p.break ?? null,
    preSpeed: migratePreSpeed(p.preSpeed),
    outcome: p.outcome ?? null,
    postSpeed: p.postSpeed ?? null,
    startLine: p.startLine ?? null,
    read: p.read ?? null,
    feel: p.feel ?? null,
    note: p.note ?? null,
  };
}
