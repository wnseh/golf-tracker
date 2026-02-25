import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/ui/bottom-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-accent">Golf Tracker</h1>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-text2 hover:text-text transition"
          >
            Sign Out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
