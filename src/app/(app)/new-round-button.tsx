'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { InputMode, WeatherVal } from '@/lib/types';
import { WEATHER_OPTIONS, WEATHER_LABELS, WEATHER_ICONS, MODE_OPTIONS, MODE_LABELS } from '@/lib/constants';

const TEE_OPTIONS = ['BK', 'BL', 'WH', 'RD'] as const;
const HOLE_OPTIONS = [9, 18] as const;

interface NewRoundButtonProps {
  defaultMode?: InputMode;
}

export function NewRoundButton({ defaultMode = 'serious' }: NewRoundButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tee, setTee] = useState('WH');
  const [holes, setHoles] = useState<number>(18);
  const [handicap, setHandicap] = useState('');
  const [rating, setRating] = useState('');
  const [greenSpeed, setGreenSpeed] = useState(3.0);
  const [weather, setWeather] = useState<WeatherVal | ''>('');
  const [temperature, setTemperature] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(defaultMode);

  async function handleCreate() {
    if (!course.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        setError(authErr?.message ?? 'Not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      const { data, error: insertErr } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id,
          course: course.trim(),
          date,
          tee,
          holes,
          handicap: handicap ? parseFloat(handicap) : null,
          rating: rating ? parseFloat(rating) : null,
          green_speed: greenSpeed,
          weather: weather || null,
          temperature: temperature ? parseFloat(temperature) : null,
          input_mode: inputMode,
        })
        .select('id')
        .single();

      if (insertErr || !data) {
        setError(insertErr?.message ?? 'Failed to create round.');
        setLoading(false);
        return;
      }

      router.push(`/round/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
      >
        + New Round
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold">New Round</h3>

        {/* Mode selector */}
        <div>
          <label className="block text-sm text-text2 mb-1">Mode</label>
          <div className="flex gap-1.5">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setInputMode(m)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  inputMode === m
                    ? 'bg-accent text-bg'
                    : 'border border-border bg-surface2 text-text2 hover:border-border2'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-text2 mb-1">Course *</label>
          <input
            type="text"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text placeholder:text-text3 focus:border-accent focus:outline-none"
            placeholder="Course name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-text2 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Tee</label>
            <div className="flex gap-1.5">
              {TEE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTee(t)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                    tee === t
                      ? 'bg-accent text-bg'
                      : 'border border-border bg-surface2 text-text2 hover:border-border2'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Holes</label>
            <div className="flex gap-1.5">
              {HOLE_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHoles(h)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                    holes === h
                      ? 'bg-accent text-bg'
                      : 'border border-border bg-surface2 text-text2 hover:border-border2'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Handicap</label>
            <input
              type="number"
              step="0.1"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text placeholder:text-text3 focus:border-accent focus:outline-none"
              placeholder="—"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Rating</label>
            <input
              type="number"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text placeholder:text-text3 focus:border-accent focus:outline-none"
              placeholder="—"
            />
          </div>
        </div>

        {/* Green Speed */}
        <div>
          <label className="block text-sm text-text2 mb-1">Green Speed</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={2.0} max={4.0} step={0.1}
              value={greenSpeed}
              onChange={(e) => setGreenSpeed(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded bg-border2 accent-accent cursor-pointer"
            />
            <span className="text-sm font-mono text-text2 w-8 text-right">{greenSpeed.toFixed(1)}</span>
          </div>
        </div>

        {/* Weather + Temperature */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Weather</label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value as WeatherVal | '')}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">—</option>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{WEATHER_ICONS[w]} {WEATHER_LABELS[w]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text2 mb-1">Temp (°C)</label>
            <input
              type="number"
              step="0.5"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text placeholder:text-text3 focus:border-accent focus:outline-none"
              placeholder="—"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red bg-red-dim rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setOpen(false); setError(null); }}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm text-text2 transition hover:border-border2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!course.trim() || loading}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
