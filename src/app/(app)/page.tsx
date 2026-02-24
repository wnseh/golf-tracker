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
        <h2 className="text-xl font-bold">My Rounds</h2>
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
