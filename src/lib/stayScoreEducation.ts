/**
 * Stay Score education UI state — localStorage boolean only, no PII.
 * Sheet opens only on explicit user action; no auto-modal.
 */

const EDUCATION_KEY = 'xpressbnb_stay_score_education_seen';
const OPEN_EVENT = 'xpressbnb-stay-score-info-open';

export function hasSeenStayScoreEducation(): boolean {
  try {
    return localStorage.getItem(EDUCATION_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markStayScoreEducationSeen(): void {
  try {
    localStorage.setItem(EDUCATION_KEY, 'true');
  } catch {
    /* fail silently */
  }
}

export function openStayScoreInfo(): void {
  markStayScoreEducationSeen();
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { open: true } }));
}

export function closeStayScoreInfo(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { open: false } }));
}

export function subscribeStayScoreInfoOpen(listener: (open: boolean) => void): () => void {
  const onEvent = (e: Event) => {
    const detail = (e as CustomEvent<{ open: boolean }>).detail;
    listener(detail?.open ?? true);
  };
  window.addEventListener(OPEN_EVENT, onEvent);
  return () => window.removeEventListener(OPEN_EVENT, onEvent);
}
