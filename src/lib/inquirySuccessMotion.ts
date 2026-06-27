/** Shared motion tokens for inquiry success experience */

export const INQUIRY_MOTION_MS = 200;
export const INQUIRY_MOTION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const INQUIRY_TRANSITION_STEP_MS = 650;
export const INQUIRY_TRANSITION_MIN_TOTAL_MS = 2200;

export const INQUIRY_TRANSITION_LINES = [
  'Submitting your travel request...',
  'Preparing your Guest ID...',
  'Introducing you to the host...',
  'Almost ready...',
] as const;

export type InquiryTransitionStep = 0 | 1 | 2 | 3;

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
