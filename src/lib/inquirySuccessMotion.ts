/** Shared motion tokens for inquiry success experience */

export const INQUIRY_MOTION_MS = 200;
export const INQUIRY_MOTION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Minimum readable dwell per phase when async work finishes instantly (not fake progress). */
export const INQUIRY_PHASE_MIN_DWELL_MS = 200;

export const INQUIRY_TRANSITION_PHASES = [
  'Sending your request…',
  'Finding your host…',
  'Ready.',
] as const;

export type InquiryTransitionPhase = 0 | 1 | 2;

/** @deprecated Use InquiryTransitionPhase */
export type InquiryTransitionStep = InquiryTransitionPhase;

/** @deprecated */
export const INQUIRY_TRANSITION_LINES = INQUIRY_TRANSITION_PHASES;

/** @deprecated */
export const INQUIRY_TRANSITION_STEP_MS = INQUIRY_PHASE_MIN_DWELL_MS;

/** @deprecated */
export const INQUIRY_TRANSITION_MIN_TOTAL_MS = 600;

export function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1) {
    const p = parts[0]!;
    return p.length >= 2 ? p.slice(0, 2).toUpperCase() : `${p.charAt(0)}`.toUpperCase();
  }
  return 'G';
}

export function formatCreatedTodayLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMemberSinceLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatIssueDateLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
