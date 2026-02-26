'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { WeatherVal, InputMode } from '@/lib/types';
import { WEATHER_OPTIONS, WEATHER_LABELS, WEATHER_ICONS, MODE_LABELS } from '@/lib/constants';

const TEE_OPTIONS = ['BK', 'BL', 'WH', 'RD'] as const;
const HOLE_OPTIONS = [9, 18] as const;

interface RoundRow {
  id: string;
  course: string;
  date: string;
  tee: string | null;
  holes: number;
  handicap: number | null;
  rating: number | null;
  green_speed: number | null;
  weather: string | null;
  temperature: number | null;
  input_mode: string | null;
}

interface RoundListProps {
  rounds: RoundRow[];
}

export function RoundList({ rounds: initialRounds }: RoundListProps) {
  const router = useRouter();
  const [rounds, setRounds] = useState(initialRounds);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form state
  const [course, setCourse] = useState('');
  const [date, setDate] = useState('');
  const [tee, setTee] = useState('WH');
  const [holes, setHoles] = useState<number>(18);
  const [handicap, setHandicap] = useState('');
  const [rating, setRating] = useState('');
  const [greenSpeed, setGreenSpeed] = useState(3.0);
  const [weather, setWeather] = useState<WeatherVal | ''>('');
  const [temperature, setTemperature] = useState('');

  function openEdit(round: RoundRow) {
    setCourse(round.course);
    setDate(round.date);
    setTee(round.tee ?? 'WH');
    setHoles(round.holes);
    setHandicap(round.handicap != null ? String(round.handicap) : '');
    setRating(round.rating != null ? String(round.rating) : '');
    setGreenSpeed(round.green_speed ?? 3.0);
    setWeather((round.weather as WeatherVal) ?? '');
    setTemperature(round.temperature != null ? String(round.temperature) : '');
    setError(null);
    setConfirmDelete(false);
    setEditId(round.id);
  }

  function closeEdit() {
    setEditId(null);
    setError(null);
    setConfirmDelete(false);
  }

  async function handleUpdate() {
    if (!editId || !course.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('rounds')
        .update({
          course: course.trim(),
          date,
          tee,
          holes,
          handicap: handicap ? parseFloat(handicap) : null,
          rating: rating ? parseFloat(rating) : null,
          green_speed: greenSpeed,
          weather: weather || null,
          temperature: temperature ? parseFloat(temperature) : null,
        })
        .eq('id', editId);

      if (err) {
        setError(err.message);
        return;
      }

      setRounds((prev) =>
        prev.map((r) =>
          r.id === editId
            ? {
                ...r,
                course: course.trim(), date, tee, holes,
                handicap: handicap ? parseFloat(handicap) : null,
                rating: rating ? parseFloat(rating) : null,
                green_speed: greenSpeed,
                weather: weather || null,
                temperature: temperature ? parseFloat(temperature) : null,
              }
            : r
        )
      );
      closeEdit();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('rounds').delete().eq('id', editId);
      if (err) {
        setError(err.message);
        return;
      }
      setRounds((prev) => prev.filter((r) => r.id !== editId));
      closeEdit();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-text2 mb-2">No rounds yet</p>
        <p className="text-sm text-text3">
          Tap &quot;+ New Round&quot; to start tracking
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rounds.map((round) => {
          const dateStr = new Date(round.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const modeLabel = MODE_LABELS[(round.input_mode as InputMode) ?? 'serious'];
          const weatherIcon = round.weather ? WEATHER_ICONS[round.weather as WeatherVal] : null;

          return (
            <div
              key={round.id}
              className="relative rounded-xl border border-border bg-surface transition hover:border-border2"
            >
              <Link
                href={`/round/${round.id}`}
                className="block p-4 pr-12"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{round.course}</p>
                    <p className="text-sm text-text2 mt-0.5">
                      {dateStr}
                      {weatherIcon && ` ${weatherIcon}`}
                      {round.temperature != null && ` ${round.temperature}°C`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text2">{round.holes} holes</p>
                    <p className="text-xs text-text3 mt-0.5">
                      {round.tee && `${round.tee} tee`}
                      {' · '}{modeLabel}
                    </p>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openEdit(round);
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg text-text3 hover:text-text2 hover:bg-surface2 transition"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Edit Round</h3>

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
                      type="button"
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
                      type="button"
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
                type="button"
                onClick={closeEdit}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm text-text2 transition hover:border-border2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={!course.trim() || loading}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className={`w-full rounded-lg border-2 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                confirmDelete
                  ? 'border-red bg-red text-bg hover:opacity-90'
                  : 'border-red bg-red-dim text-red hover:opacity-90'
              }`}
            >
              {loading ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete Round'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
