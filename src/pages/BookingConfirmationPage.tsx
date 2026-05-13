import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import GuestTripConfirmation from '../components/GuestTripConfirmation';
import { supabase } from '../lib/supabase';
import {
  loadBookingConfirmationSnapshot,
  type BookingConfirmationSnapshot,
} from '../lib/bookingConfirmationStorage';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; snapshot: BookingConfirmationSnapshot; source: 'snapshot' | 'remote' }
  | { status: 'error'; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function navigateToPage(page: string) {
  window.history.pushState({}, '', page);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function parseBookingIdFromPath(): string | null {
  const path = window.location.pathname;
  const m = path.match(/^\/booking\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function BookingConfirmationPage() {
  const bookingId = useMemo(() => parseBookingIdFromPath(), []);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const goHome = useCallback(() => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!bookingId || !UUID_RE.test(bookingId)) {
        setState({
          status: 'error',
          message:
            'This booking link doesn’t look valid. Check the link you were sent or open the page from the device where you completed booking.',
        });
        return;
      }

      const snap = loadBookingConfirmationSnapshot(bookingId);
      if (snap) {
        setState({ status: 'ready', snapshot: snap, source: 'snapshot' });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email?.trim().toLowerCase();
      if (!email) {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              'We couldn’t load this trip on this device. Sign in with the email you used to book, or open the confirmation from the same browser where you submitted your request.',
          });
        }
        return;
      }

      const { data: row, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          guest_email,
          check_in_date,
          check_out_date,
          num_guests,
          amount_total,
          total_price,
          payment_status,
          status,
          include_decoration,
          host_id,
          property_id,
          properties (
            id,
            title,
            city,
            slug
          )
        `,
        )
        .eq('id', bookingId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setState({
          status: 'error',
          message:
            'We couldn’t load your booking details. If you’re signed into a different account, switch to the one you used when booking.',
        });
        return;
      }

      if (!row) {
        setState({
          status: 'error',
          message: 'We couldn’t find a booking for this link. It may have been removed, or the link may be incorrect.',
        });
        return;
      }

      const guestEmail = (row as { guest_email: string }).guest_email?.trim().toLowerCase();
      if (guestEmail && email && guestEmail !== email) {
        setState({
          status: 'error',
          message:
            'You’re signed in with a different email than the one on this booking. Sign out and sign in with the booking email, or use the original confirmation link.',
        });
        return;
      }

      // The PostgREST-embedded `properties` relation isn't part of the
      // generated `bookings.Row` type (it surfaces as a SelectQueryError at
      // the type level), so narrow through `unknown` once here.
      const props = (row as unknown as { properties: { title: string; city: string; slug: string | null } | null }).properties;
      const title = props?.title ?? 'Your stay';
      const city = props?.city ?? '';
      const slug = props?.slug ?? null;
      // Guests authenticated via Supabase can read their booking + property, but
      // hosts.name is not exposed to guests under current RLS (hosts SELECT is
      // own-profile only). Snapshot from sessionStorage still carries the host
      // label captured at booking time when the insert client could read hosts.
      const hostContactName: string | null = null;

      const amount =
        (row as { amount_total: number | null }).amount_total ??
        (row as { total_price: number }).total_price ??
        0;

      const snapshot: BookingConfirmationSnapshot = {
        v: 1,
        savedAt: Date.now(),
        bookingId: (row as { id: string }).id,
        propertyId: (row as { property_id: string }).property_id,
        propertyTitle: title,
        propertyCity: city,
        propertySlug: slug,
        checkIn: (row as { check_in_date: string }).check_in_date,
        checkOut:
          (row as { check_out_date: string | null }).check_out_date ??
          (row as { check_in_date: string }).check_in_date,
        numGuests: (row as { num_guests: number }).num_guests,
        estimatedTotal: Number(amount),
        guestEmail: (row as { guest_email: string }).guest_email,
        hostContactName,
        includeDecoration: Boolean((row as { include_decoration?: boolean }).include_decoration),
        paymentStatus: String((row as { payment_status: string }).payment_status ?? 'pending'),
        bookingStatus: String((row as { status: string }).status ?? 'confirmed'),
      };

      setState({ status: 'ready', snapshot, source: 'remote' });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-[var(--xpx-bg)]">
      <SEOHead
        config={{
          title: 'Trip confirmation | XpressBnB',
          description: 'Your stay summary and host contact on XpressBnB.',
        }}
      />
      <Header
        onAboutClick={() => navigateToPage('/?page=about')}
        onBlogClick={() => navigateToPage('/?page=blog')}
        onHostLoginClick={() => navigateToPage('/auth/login')}
      />

      <main className="max-w-3xl mx-auto pt-4 sm:pt-8 pb-16" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4" role="status" aria-live="polite">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-xpx-muted">Loading your trip…</p>
          </div>
        )}

        {state.status === 'error' && (
          <div
            className="mx-4 sm:mx-auto max-w-lg rounded-2xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm"
            role="alert"
          >
            <h1 className="text-xl font-extrabold text-xpx-text">We couldn’t show this trip</h1>
            <p className="text-sm text-xpx-muted mt-3 leading-relaxed">{state.message}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigateToPage('/auth/login')}
                className="inline-flex items-center justify-center min-h-12 px-5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={goHome}
                className="inline-flex items-center justify-center min-h-12 px-5 rounded-xl font-semibold border-2 border-slate-200 text-xpx-text hover:bg-slate-50 transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        )}

        {state.status === 'ready' && (
          <GuestTripConfirmation snapshot={state.snapshot} source={state.source} onBackHome={goHome} />
        )}
      </main>
    </div>
  );
}
