import { Shield } from 'lucide-react';

const TRUST_NOTES = [
  'Your contact details stay private until an inquiry is reviewed.',
  'We check inquiries before the host sees your phone or email.',
  'Carry a genuine ID if the host asks at check-in.',
  'Confirm advance, pets, parking, and special requests directly with the host.',
] as const;

interface PropertyTrustNotesProps {
  className?: string;
}

/** Compact inquiry safety copy for property page CTAs. */
export default function PropertyTrustNotes({ className = '' }: PropertyTrustNotesProps) {
  return (
    <ul className={`space-y-1.5 text-[11px] text-xpx-muted leading-snug ${className}`}>
      {TRUST_NOTES.map((note) => (
        <li key={note} className="flex gap-2">
          <Shield
            className="w-3 h-3 shrink-0 mt-0.5"
            style={{ color: 'var(--accent-dark)' }}
            aria-hidden
          />
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
}
