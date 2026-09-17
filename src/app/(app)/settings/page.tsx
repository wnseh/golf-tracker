import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] uppercase tracking-wide text-text3">Account</p>
        <p className="mt-1 text-sm text-text2">{user?.email ?? '—'}</p>
      </div>

      <div className="border-t border-border pt-6">
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            data-testid="sign-out"
            className="w-full rounded-xl border-2 border-red bg-red-dim py-3.5 text-sm font-bold text-red transition hover:opacity-90"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
