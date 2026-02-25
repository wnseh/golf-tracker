'use client';

interface NotesSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export function NotesSection({ value, onChange }: NotesSectionProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Wind, pin location, club notes..."
      className="w-full rounded-lg border border-border bg-surface3 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none resize-none"
    />
  );
}
