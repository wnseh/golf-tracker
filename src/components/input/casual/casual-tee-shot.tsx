'use client';

import type { TeeRoutine, UserClub } from '@/lib/types';
import { TEE_CLUBS, CASUAL_TEE_RESULTS, CASUAL_TEE_DIRECTIONS, CASUAL_TEE_CONTACTS } from '@/lib/constants';
import { CASUAL_TEE_RESULT_MAP, CASUAL_TEE_DIR_MAP, CASUAL_TEE_CONTACT_MAP } from '@/lib/casual-mapping';
import { MiniToggle } from '@/components/ui/mini-toggle';

interface CasualTeeShotProps {
  teeClub: string;
  teeCarry: string;
  routine: TeeRoutine;
  par: number;
  userClubs: UserClub[];
  onClubChange: (v: string) => void;
  onCarryChange: (v: string) => void;
  onRoutineChange: (patch: Partial<TeeRoutine>) => void;
}

// Reverse maps for display
const LANDING_TO_CASUAL: Record<string, string> = {
  FW: 'FW', RO: 'Rough', BK: 'Bunker', HZ: 'Hazard', OB: 'OB',
};
const STARTLINE_TO_CASUAL: Record<string, string> = {
  pull: 'L', straight: 'C', push: 'R',
};
const FEEL_TO_CASUAL: Record<string, string> = {
  flushed: 'solid', toe: 'mishit', heel: 'mishit', high: 'mishit', low: 'mishit',
};

export function CasualTeeShot({
  teeClub, teeCarry, routine, par, userClubs,
  onClubChange, onCarryChange, onRoutineChange,
}: CasualTeeShotProps) {
  // Build club list (same logic as serious mode)
  let clubList: string[];
  if (userClubs.length > 0) {
    if (par === 3) {
      clubList = userClubs.filter((c) => c.clubName !== 'PT').map((c) => c.clubName);
    } else {
      const teeSet = new Set<string>(TEE_CLUBS);
      clubList = userClubs.filter((c) => teeSet.has(c.clubName)).map((c) => c.clubName);
      if (clubList.length === 0) clubList = userClubs.map((c) => c.clubName);
    }
  } else {
    clubList = par === 3 ? [...TEE_CLUBS, '6I', '7I', '8I', '9I', 'PW'] : [...TEE_CLUBS];
  }

  // Derive casual values from routine
  const casualResult = routine.landing ? (LANDING_TO_CASUAL[routine.landing] ?? null) : null;
  const casualDir = routine.resultStartLine ? (STARTLINE_TO_CASUAL[routine.resultStartLine] ?? null) : null;
  const casualContact = routine.feel ? (FEEL_TO_CASUAL[routine.feel] ?? null) : null;

  return (
    <div className="space-y-4">
      {/* Club */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Club</p>
        <div className="flex flex-wrap gap-1.5">
          {clubList.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onClubChange(c);
                const uc = userClubs.find((u) => u.clubName === c);
                if (uc?.totalM) onCarryChange(String(uc.totalM));
                else if (uc?.carryM) onCarryChange(String(uc.carryM));
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                teeClub === c
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border bg-surface3 text-text2 hover:border-border2'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Result</p>
        <MiniToggle
          options={CASUAL_TEE_RESULTS}
          value={casualResult}
          onChange={(v) => {
            const landing = CASUAL_TEE_RESULT_MAP[v] ?? null;
            onRoutineChange({ landing });
          }}
        />
      </div>

      {/* Direction */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Direction</p>
        <MiniToggle
          options={CASUAL_TEE_DIRECTIONS}
          value={casualDir}
          onChange={(v) => {
            const startLine = CASUAL_TEE_DIR_MAP[v] ?? 'straight';
            onRoutineChange({ resultStartLine: startLine });
          }}
        />
      </div>

      {/* Contact (optional) */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Contact</p>
        <MiniToggle
          options={CASUAL_TEE_CONTACTS}
          value={casualContact}
          onChange={(v) => {
            const feel = CASUAL_TEE_CONTACT_MAP[v] ?? null;
            onRoutineChange({ feel });
          }}
        />
      </div>
    </div>
  );
}
