export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-accent">Golf Tracker</h1>
        <p className="mt-1 text-sm text-text2">Shot-by-shot round tracking</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
