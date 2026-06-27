/**
 * Future guest account architecture — inquiry creates identity only.
 * Password / OAuth setup is deferred until a confirmed booking or return visit.
 *
 * Do not wire UI here; consumers check `shouldPromptPasswordSetup` when those
 * triggers exist (booking confirmation page, returning guest shell, etc.).
 */

export const GUEST_IDENTITY_STORAGE_KEY = 'xpx_guest_identity_v1';

export type GuestIdentityPhase = 'inquiry_only' | 'eligible_for_password' | 'authenticated';

export type FutureAuthProvider = 'password' | 'google' | 'apple' | 'phone';

export type GuestIdentityRecord = {
  v: 1;
  guestName: string;
  guestEmail: string;
  /** Latest Guest ID — not a login credential */
  primaryCustomerReference: string;
  customerReferences: string[];
  phase: GuestIdentityPhase;
  createdAt: number;
  updatedAt: number;
};

export type PasswordPromptContext = {
  hasConfirmedBooking: boolean;
  isReturningGuest: boolean;
};

/** When true, a future surface may show "Protect your Guest ID" — not on inquiry success. */
export function shouldPromptPasswordSetup(ctx: PasswordPromptContext): boolean {
  return ctx.hasConfirmedBooking || ctx.isReturningGuest;
}

function readIdentity(): GuestIdentityRecord | null {
  try {
    const raw = localStorage.getItem(GUEST_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestIdentityRecord;
    if (parsed?.v !== 1 || !parsed.guestEmail) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Record lightweight guest identity after first inquiry — no password. */
export function upsertGuestIdentityFromInquiry(input: {
  guestName: string;
  guestEmail: string;
  customerReference: string;
}): void {
  try {
    const email = input.guestEmail.trim().toLowerCase();
    const ref = input.customerReference.trim().toUpperCase();
    const existing = readIdentity();
    const now = Date.now();

    if (existing && existing.guestEmail.toLowerCase() === email) {
      const refs = existing.customerReferences.includes(ref)
        ? existing.customerReferences
        : [...existing.customerReferences, ref];
      const next: GuestIdentityRecord = {
        ...existing,
        guestName: input.guestName.trim() || existing.guestName,
        primaryCustomerReference: ref,
        customerReferences: refs,
        updatedAt: now,
      };
      localStorage.setItem(GUEST_IDENTITY_STORAGE_KEY, JSON.stringify(next));
      return;
    }

    const record: GuestIdentityRecord = {
      v: 1,
      guestName: input.guestName.trim(),
      guestEmail: email,
      primaryCustomerReference: ref,
      customerReferences: [ref],
      phase: 'inquiry_only',
      createdAt: now,
      updatedAt: now,
    };
    localStorage.setItem(GUEST_IDENTITY_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // quota / private mode
  }
}

export function loadGuestIdentity(): GuestIdentityRecord | null {
  return readIdentity();
}
