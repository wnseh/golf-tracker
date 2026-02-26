'use client';

import { useState } from 'react';
import type { UserClub, InputMode } from '@/lib/types';
import { ALL_CLUB_OPTIONS, WEDGE_DEGREES, DEFAULT_CLUBS, MODE_OPTIONS, MODE_LABELS, MODE_DESCRIPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

interface SettingsClientProps {
  initialClubs: UserClub[];
  userId: string;
  defaultMode: InputMode;
}

interface ClubRow {
  clubName: string;
  carryM: number;
  totalM: number;
}

export function SettingsClient({ initialClubs, userId, defaultMode: initialMode }: SettingsClientProps) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [clubs, setClubs] = useState<ClubRow[]>(
    initialClubs.length > 0
      ? initialClubs.map((c) => ({ clubName: c.clubName, carryM: c.carryM, totalM: c.totalM }))
      : DEFAULT_CLUBS.map((c) => ({ clubName: c.name, carryM: c.carryMale, totalM: 0 }))
  );
  const [newClub, setNewClub] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [defaultMode, setDefaultMode] = useState<InputMode>(initialMode);

  function addClub() {
    if (!newClub || clubs.some((c) => c.clubName === newClub)) return;
    const def = DEFAULT_CLUBS.find((d) => d.name === newClub);
    const carry = def
      ? (gender === 'male' ? def.carryMale : def.carryFemale)
      : 0;
    setClubs([...clubs, { clubName: newClub, carryM: carry, totalM: 0 }]);
    setNewClub('');
  }

  function removeClub(idx: number) {
    setClubs(clubs.filter((_, i) => i !== idx));
  }

  function updateClub(idx: number, patch: Partial<ClubRow>) {
    setClubs(clubs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function resetToDefault() {
    setClubs(
      DEFAULT_CLUBS.map((c) => ({
        clubName: c.name,
        carryM: gender === 'male' ? c.carryMale : c.carryFemale,
        totalM: 0,
      }))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();

      // Save clubs
      await supabase.from('user_clubs').delete().eq('user_id', userId);
      if (clubs.length > 0) {
        const rows = clubs.map((c, i) => ({
          user_id: userId,
          club_name: c.clubName,
          carry_m: c.carryM,
          total_m: c.totalM,
          sort_order: i,
        }));
        const { error } = await supabase.from('user_clubs').insert(rows);
        if (error) {
          setToast('Save failed');
          setTimeout(() => setToast(null), 2000);
          return;
        }
      }

      // Save user settings (upsert)
      const { error: settingsErr } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          default_mode: defaultMode,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (settingsErr) {
        setToast('Settings save failed');
        setTimeout(() => setToast(null), 2000);
        return;
      }

      setToast('Saved!');
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSaving(false);
    }
  }

  // Build available clubs (exclude already added)
  const addedSet = new Set(clubs.map((c) => c.clubName));
  const availableClubs = [
    ...ALL_CLUB_OPTIONS.filter((c) => !addedSet.has(c)),
    ...WEDGE_DEGREES.filter((c) => !addedSet.has(c)),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Default Mode */}
      <div>
        <p className="text-sm font-medium text-text2 mb-2">Default Input Mode</p>
        <div className="flex gap-2">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDefaultMode(m)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                defaultMode === m
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border bg-surface3 text-text2 hover:border-border2'
              }`}
            >
              <div>{MODE_LABELS[m]}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{MODE_DESCRIPTIONS[m]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <p className="text-sm font-medium text-text2 mb-2">Default Distance (Gender)</p>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                gender === g
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border bg-surface3 text-text2 hover:border-border2'
              }`}
            >
              {g === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Club list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-text2">My Clubs</p>
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs text-text3 hover:text-accent transition"
          >
            Reset to Default
          </button>
        </div>

        <div className="space-y-2">
          {clubs.map((club, i) => (
            <div key={`${club.clubName}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface2 p-2.5">
              <span className="text-sm font-medium text-text w-16 shrink-0">{club.clubName}</span>
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-text3 block">Carry (m)</label>
                  <input
                    type="number"
                    value={club.carryM || ''}
                    onChange={(e) => updateClub(i, { carryM: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-surface3 px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-text3 block">Total (m)</label>
                  <input
                    type="number"
                    value={club.totalM || ''}
                    onChange={(e) => updateClub(i, { totalM: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-surface3 px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeClub(i)}
                className="text-text3 hover:text-red text-sm shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add club */}
      <div className="flex gap-2">
        <select
          value={newClub}
          onChange={(e) => setNewClub(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="">Add a club...</option>
          {availableClubs.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addClub}
          disabled={!newClub}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Sign Out */}
      <div className="border-t border-border pt-6">
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-red bg-red-dim py-3.5 text-sm font-bold text-red transition hover:opacity-90"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-surface2 border border-border px-4 py-2.5 text-sm font-medium text-text shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
