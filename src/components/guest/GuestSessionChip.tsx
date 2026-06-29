import { useEffect, useState } from 'react';
import {
  GUEST_IDENTITY_UPDATED_EVENT,
  loadGuestIdentity,
} from '../../lib/guestIdentityFuture';
import { navigateTo } from '../../lib/navigation';

type GuestSessionChipProps = {
  scrolled?: boolean;
  className?: string;
};

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || 'Guest';
}

export default function GuestSessionChip({ scrolled = true, className = '' }: GuestSessionChipProps) {
  const [identity, setIdentity] = useState(() => loadGuestIdentity());

  useEffect(() => {
    const sync = () => setIdentity(loadGuestIdentity());
    window.addEventListener(GUEST_IDENTITY_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(GUEST_IDENTITY_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!identity) return null;

  const textClass = scrolled ? 'text-xpx-text' : 'text-white';
  const mutedClass = scrolled ? 'text-xpx-muted' : 'text-white/80';

  return (
    <div className={`hidden md:flex items-center gap-3 min-w-0 ${className}`}>
      <div className="min-w-0 text-right">
        <p className={`text-xs font-medium ${mutedClass}`}>Welcome,</p>
        <p className={`text-sm font-bold truncate max-w-[9rem] ${textClass}`}>
          {firstName(identity.guestName)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigateTo('/')}
        className={`shrink-0 min-h-[48px] px-3 text-xs font-semibold ${mutedClass} hover:opacity-80 transition-opacity`}
      >
        Continue later
      </button>
    </div>
  );
}
