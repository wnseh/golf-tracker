export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Round header skeleton */}
      <div>
        <div className="h-5 w-40 rounded bg-surface2" />
        <div className="h-4 w-28 rounded bg-surface2 mt-1.5" />
      </div>

      {/* Hole nav skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-9 w-9 shrink-0 rounded-full bg-surface2" />
        ))}
      </div>

      {/* Sections skeleton */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-14 rounded-xl border border-border bg-surface2" />
      ))}
    </div>
  );
}
