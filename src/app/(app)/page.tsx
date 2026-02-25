import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NewRoundButton } from './new-round-button';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .order('date', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">My Rounds</h2>
          <Link
            href="/settings"
            className="text-text3 hover:text-text2 transition"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
        <NewRoundButton />
      </div>

      {!rounds || rounds.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text2 mb-2">No rounds yet</p>
          <p className="text-sm text-text3">
            Tap &quot;+ New Round&quot; to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => {
            const dateStr = new Date(round.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <Link
                key={round.id}
                href={`/round/${round.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition hover:border-border2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{round.course}</p>
                    <p className="text-sm text-text2 mt-0.5">{dateStr}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text2">
                      {round.holes} holes
                    </p>
                    {round.tee && (
                      <p className="text-xs text-text3 mt-0.5">{round.tee} tee</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
