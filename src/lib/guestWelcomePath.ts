export function parseGuestWelcomeRoute(pathname: string): {
  guestReference: string;
  email: string;
} {
  const match = pathname.match(/^\/(?:guest\/welcome|inquiry\/success)\/([^/]+)/);
  const guestReference = decodeURIComponent(match?.[1] ?? '').trim().toUpperCase();
  const email = new URLSearchParams(window.location.search).get('email')?.trim() ?? '';
  return { guestReference, email };
}

/** @deprecated Use inquirySuccessPath from inquirySuccessStorage */
export { inquirySuccessPath as guestWelcomePath } from './inquirySuccessStorage';
