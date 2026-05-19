import { useState } from 'react';
import { X } from 'lucide-react';

interface RejectInquiryDialogProps {
  open: boolean;
  guestName: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
  busy?: boolean;
}

/**
 * Optional note when host rejects an inquiry or offer.
 */
export default function RejectInquiryDialog({
  open,
  guestName,
  onClose,
  onConfirm,
  busy = false,
}: RejectInquiryDialogProps) {
  const [note, setNote] = useState('');

  if (!open) return null;

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal={true}
      aria-labelledby="reject-inquiry-heading"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={handleClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-xl"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="reject-inquiry-heading" className="text-lg font-bold text-xpx-text">
              Reject inquiry
            </h2>
            <p className="text-sm text-xpx-muted mt-1">
              {guestName} will be notified. You can add an optional note.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-xpx-muted hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          placeholder="Optional message to guest (e.g. dates unavailable)"
          rows={3}
          className="w-full rounded-xl px-3 py-2.5 text-sm text-xpx-text resize-none"
          style={{
            background: 'var(--xpx-surface-light)',
            border: '1px solid var(--xpx-border-strong)',
          }}
        />
        <p className="text-[10px] text-xpx-subtle mt-1 text-right">{note.length}/300</p>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{
              background: 'var(--xpx-surface-light)',
              border: '1px solid var(--xpx-border-strong)',
              color: 'var(--xpx-text)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim())}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
            style={{ background: '#B91C1C' }}
          >
            Reject inquiry
          </button>
        </div>
      </div>
    </div>
  );
}
