interface PropertyTrustNotesProps {
  className?: string;
}

/** Editorial whisper — concierge reassurance, not a marketing checklist. */
export default function PropertyTrustNotes({ className = '' }: PropertyTrustNotesProps) {
  return (
    <p className={`xpx-concierge-whisper leading-relaxed ${className}`}>
      Your inquiry is reviewed personally before confirmation. Transparent pricing — flexible
      arrangements available directly with your host.
    </p>
  );
}
