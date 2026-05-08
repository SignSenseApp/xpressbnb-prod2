/** Serialize / parse hero → listing → property trip params (?checkin=&checkout=&guests=). */

export type TripParams = {
  checkin: string;
  checkout: string;
  guests: number;
};

export function parseTripFromSearch(search: string): Partial<TripParams> {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const p = new URLSearchParams(q);
  const checkin = p.get('checkin')?.trim() || '';
  const checkout = p.get('checkout')?.trim() || '';
  const guestsRaw = p.get('guests');
  let guests: number | undefined;
  if (guestsRaw != null && guestsRaw !== '') {
    const n = parseInt(guestsRaw, 10);
    if (!Number.isNaN(n)) guests = Math.min(16, Math.max(1, n));
  }
  return { checkin, checkout, guests };
}

export function buildTripQuery(partial: Partial<TripParams>): string {
  const params = new URLSearchParams();
  if (partial.checkin) params.set('checkin', partial.checkin);
  if (partial.checkout) params.set('checkout', partial.checkout);
  if (partial.guests != null && partial.guests > 0) params.set('guests', String(partial.guests));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function formatTripChip(checkin: string, checkout: string, guests: number): string {
  const cin = checkin ? new Date(`${checkin}T12:00:00`) : null;
  const cout = checkout ? new Date(`${checkout}T12:00:00`) : null;
  const df = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  let dates = '';
  if (cin && cout && cout > cin) dates = `${df(cin)} – ${df(cout)}`;
  else if (cin) dates = `${df(cin)} · Add checkout`;
  else dates = 'Dates flexible';
  const g = `${guests} ${guests === 1 ? 'guest' : 'guests'}`;
  return `${dates} · ${g}`;
}
