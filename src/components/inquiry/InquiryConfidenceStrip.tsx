/** Pre-submit reassurance — concierge whisper, not a checklist. */
export default function InquiryConfidenceStrip({ className = '' }: { className?: string }) {
  return (
    <p
      className={`xpx-concierge-whisper leading-relaxed ${className}`}
      role="note"
    >
      No payment is taken now. A member of our team will review availability personally and
      follow up shortly. You may track your request at any time with your guest reference.
    </p>
  );
}
