'use client';

import type { PuttCard as PuttCardType, PuttFeelVal, ReadVal } from '@/lib/types';
import {
  PUTT_SLOPES, PUTT_BREAKS,
  PUTT_POST_SPEEDS, PUTT_START_LINES, PUTT_FEELS,
} from '@/lib/constants';
import { RoutineBlock } from '@/components/ui/routine-block';
import { MiniToggle } from '@/components/ui/mini-toggle';
import { ReadRow } from '@/components/ui/read-row';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface PuttCardProps {
  index: number;
  putt: PuttCardType;
  onChange: (patch: Partial<PuttCardType>) => void;
  onRemove: () => void;
}

export function PuttCard({ index, putt, onChange, onRemove }: PuttCardProps) {
  const distNum = parseFloat(putt.dist ?? '3');
  const sliderVal = isNaN(distNum) ? 3 : Math.min(30, Math.max(1, distNum));

  function syncDist(val: number, _source: 'slider' | 'input') {
    const clamped = Math.min(30, Math.max(1, val));
    onChange({ dist: String(clamped) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface2 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text2">PUTT {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-text3 hover:text-red text-sm">✕</button>
      </div>

      {/* PRE */}
      <RoutineBlock type="pre" title="Read & Plan" defaultOpen>
        {/* DISTANCE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Putt Distance</p>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="range"
            min={1} max={30} step={0.5}
            value={sliderVal}
            onChange={(e) => syncDist(parseFloat(e.target.value), 'slider')}
            className="flex-1 h-1 rounded bg-border2 accent-accent cursor-pointer"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1} max={30} step={0.5}
              value={putt.dist ?? '3'}
              onChange={(e) => syncDist(parseFloat(e.target.value), 'input')}
              className="w-14 rounded-lg border border-border bg-surface3 px-2 py-1.5 text-sm text-text text-center focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-text3">m</span>
          </div>
        </div>

        {/* SLOPE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Slope</p>
        <MiniToggle options={PUTT_SLOPES} value={putt.slope} onChange={(v) => onChange({ slope: v })} />

        {/* BREAK */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-3 mb-2">Break</p>
        <MiniToggle options={PUTT_BREAKS} value={putt.break} onChange={(v) => onChange({ break: v })} />

      </RoutineBlock>

      {/* POST */}
      <RoutineBlock type="post" title="Result">
        {/* SPEED */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Speed</p>
        <MiniToggle options={PUTT_POST_SPEEDS} value={putt.postSpeed} onChange={(v) => onChange({ postSpeed: v })} />

        {/* START LINE */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-3 mb-2">Start Line</p>
        <MiniToggle options={PUTT_START_LINES} value={putt.startLine} onChange={(v) => onChange({ startLine: v })} />

        {/* READ */}
        <div className="flex items-center mt-3 mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text3 font-medium">Read</p>
          <InfoTooltip>
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-text3 font-medium">Post-Putt Read</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-8 font-mono font-semibold text-red">R--</span>
                  <span className="text-text2">훨씬 덜 꺾임</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-8 font-mono font-semibold text-yellow">R-</span>
                  <span className="text-text2">덜 꺾임</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-8 font-mono font-semibold text-accent">R0</span>
                  <span className="text-text2">정확</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-8 font-mono font-semibold text-yellow">R+</span>
                  <span className="text-text2">더 꺾임</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-8 font-mono font-semibold text-red">R++</span>
                  <span className="text-text2">훨씬 더 꺾임</span>
                </div>
              </div>
            </div>
          </InfoTooltip>
        </div>
        <ReadRow value={putt.read} onChange={(v) => onChange({ read: v })} />

        {/* FEEL */}
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-3 mb-2">Stroke Feel</p>
        <MiniToggle options={PUTT_FEELS} value={putt.feel} onChange={(v) => onChange({ feel: v })} />

        {/* NOTE */}
        <textarea
          value={putt.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value || null })}
          rows={2}
          placeholder="Putt notes..."
          className="mt-3 w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none resize-none"
        />
      </RoutineBlock>
    </div>
  );
}
