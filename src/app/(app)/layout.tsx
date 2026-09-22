import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logError, isSessionMissing } from '@/lib/log';
import { BottomNav } from '@/components/ui/bottom-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isSessionMissing(error)) logError('auth.getUser', error, { where: 'app-layout' });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-accent">Golf Tracker</h1>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
