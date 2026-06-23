/**
 * First-time XpressBNB Stay Score intro — localStorage only, no PII.
 */

const STORAGE_KEY = 'xpressbnb_stay_score_intro_v1';
const OPEN_EVENT = 'xpressbnb-stay-score-intro-open';
const AUTO_REQUEST_EVENT = 'xpressbnb-stay-score-intro-request';

let autoShowQueued = false;

export function hasSeenStayScoreIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markStayScoreIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { open: false } }));
}

/** Open explainer manually (e.g. info tap on badge). */
export function openStayScoreIntro(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { open: true } }));
}

/** Request one-time auto modal when the first card badge mounts. */
export function requestStayScoreIntroAutoShow(): void {
  if (hasSeenStayScoreIntro() || autoShowQueued) return;
  autoShowQueued = true;
  window.dispatchEvent(new CustomEvent(AUTO_REQUEST_EVENT));
}

export function subscribeStayScoreIntroOpen(
  listener: (open: boolean) => void,
): () => void {
  const onOpen = (e: Event) => {
    const detail = (e as CustomEvent<{ open: boolean }>).detail;
    listener(detail?.open ?? true);
  };
  const onAuto = () => listener(true);
  window.addEventListener(OPEN_EVENT, onOpen);
  window.addEventListener(AUTO_REQUEST_EVENT, onAuto);
  return () => {
    window.removeEventListener(OPEN_EVENT, onOpen);
    window.removeEventListener(AUTO_REQUEST_EVENT, onAuto);
  };
}
