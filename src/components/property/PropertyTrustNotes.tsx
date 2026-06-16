import { Shield } from 'lucide-react';

const TRUST_NOTES = [
  'You can ask the host for the best available price.',
  'Host may request a small token advance to confirm.',
  'Share genuine ID with the host before check-in if requested.',
  'XpressBNB does not charge guest commission.',
] as const;

interface PropertyTrustNotesProps {
  className?: string;
}

/** Compact direct-booking trust copy for property page contact/inquiry areas. */
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
