import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen,
  Calendar,
  User,
  Mail,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import {
  parseOfferFromSpecialRequests,
  buildCounterOfferRequest,
  type ParsedOffer,
} from '../../lib/offers';
import CounterOfferDialog from '../../components/CounterOfferDialog';
import RealtimeToast, { type ToastPayload } from '../../components/RealtimeToast';
import { theme } from '../../lib/theme';

// Aligned with `bookings` Row in database.types.ts. Schema uses *_date and num_guests.
interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string | null;
  num_guests: number;
  amount_total: number | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: string;
  razorpay_payment_id?: string | null;
  special_requests: string | null;
  created_at: string;
  properties: {
    title: string;
    city: string;
    price_per_day: number | null;
    price_full_day: number | null;
  } | null;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

/**
 * BookingsPage — host view of incoming requests.
 *
 * Two surfaces in one page:
 *  1. "Offer requests" — bookings with payment_status === 'offer_pending' OR
 *     a `[OFFER]` envelope in special_requests. Host can Accept, Counter, or
 *     Reject directly from the card.
 *  2. "Bookings" — every other booking row, filterable by status.
 *
 * Action semantics:
 *  - Accept offer:   payment_status -> 'pending', status -> 'confirmed' (host accepted; awaiting payment).
 *  - Counter offer:  special_requests gains a `[COUNTER ₹X]` tag + host note; payment_status stays 'offer_pending'.
 *  - Reject offer:   status -> 'cancelled'.
 */
export default function BookingsPage() {
  const { host } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [counterTarget, setCounterTarget] = useState<{ booking: Booking; offer: ParsedOffer } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    if (host?.id) {
      loadBookings();
    }
  }, [host?.id]);

  // Realtime subscription: ping the host the instant a guest creates a new
  // offer or booking against any of their properties. The boss sees this
  // even while the page is open in another tab without needing a refresh.
  useEffect(() => {
    if (!host?.id) return;
    const channel = supabase
      .channel(`bookings-host-${host.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `host_id=eq.${host.id}`,
        },
        (payload) => {
          // Refresh the list so the new row appears in the right section.
          loadBookings();

          const row = payload.new as Partial<Booking> | undefined;
          if (!row) return;
          const isOffer =
            row.payment_status === 'offer_pending' ||
            /^\s*\[OFFER/i.test(row.special_requests ?? '');
          const guestName = row.guest_name || 'A guest';
          setToast({
            id: row.id ?? `${Date.now()}`,
            title: isOffer ? 'New offer received' : 'New booking received',
            body: isOffer
              ? `${guestName} sent you an offer. Tap to review.`
              : `${guestName} just booked your property.`,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host?.id]);

  const loadBookings = async () => {
    if (!host?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, properties(title, city, price_per_day, price_full_day)')
        .eq('host_id', host.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data as unknown as Booking[]) || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Partition bookings into offers vs regular bookings.
  // A row is an offer if payment_status is offer_pending OR special_requests
  // contains an [OFFER] envelope and the booking has not been finalized yet.
  const isOfferRow = (b: Booking): boolean => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    if (b.payment_status === 'offer_pending') return true;
    return /^\s*\[OFFER/i.test(b.special_requests ?? '');
  };

  const offerRows = bookings.filter(isOfferRow);
  const otherRows = bookings.filter((b) => !isOfferRow(b));
  const filteredOther = filter === 'all' ? otherRows : otherRows.filter((b) => b.status === filter);

  const handleAcceptOffer = async (b: Booking) => {
    setBusyId(b.id);
    try {
      // Convert offer into a real pending booking awaiting payment.
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'pending', status: 'confirmed' })
        .eq('id', b.id);
      if (error) throw error;
      await loadBookings();
    } catch (e) {
      console.error('Accept offer failed', e);
      alert('Could not accept the offer. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectOffer = async (b: Booking) => {
    if (!confirm('Reject this offer? The guest will be notified.')) return;
    setBusyId(b.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'offer_rejected' })
        .eq('id', b.id);
      if (error) throw error;
      await loadBookings();
    } catch (e) {
      console.error('Reject offer failed', e);
      alert('Could not reject the offer. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCounterSubmit = async (newPerNight: number, hostMessage: string) => {
    if (!counterTarget) return;
    const { booking } = counterTarget;
    setBusyId(booking.id);
    try {
      const updatedRequests = buildCounterOfferRequest(
        booking.special_requests ?? '',
        newPerNight,
        hostMessage,
      );
      const { error } = await supabase
        .from('bookings')
        .update({
          special_requests: updatedRequests,
          payment_status: 'offer_countered',
        })
        .eq('id', booking.id);
      if (error) throw error;
      setCounterTarget(null);
      await loadBookings();
    } catch (e) {
      console.error('Counter offer failed', e);
      alert('Could not send counter. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    setBusyId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      if (error) throw error;
      await loadBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking status');
    } finally {
      setBusyId(null);
    }
  };

  const getStatusStyles = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(244,162,97,0.12)', color: theme.warm };
      case 'confirmed':
        return { bg: 'rgba(22,163,74,0.10)', color: '#15803D' };
      case 'cancelled':
        return { bg: 'rgba(220,38,38,0.08)', color: '#B91C1C' };
      case 'completed':
        return { bg: 'rgba(37,99,235,0.10)', color: '#2563EB' };
      default:
        return { bg: 'var(--xpx-surface-light)', color: 'var(--xpx-muted)' };
    }
  };

  const StatusIcon = ({ status }: { status: Booking['status'] }) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.warm }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight">Bookings</h1>
          <p className="text-xpx-muted mt-2">Review offer requests and confirmed bookings</p>
        </div>
      </div>

      {/* ───────── Offers section — gentle warm gradient on light bg ───────── */}
      {offerRows.length > 0 && (
        <section
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(244,162,97,0.06) 0%, var(--xpx-surface) 100%)',
            border: '1px solid rgba(244,162,97,0.25)',
            boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="xpx-eyebrow">Open negotiations</p>
              <h2 className="text-xl font-extrabold text-xpx-text tracking-tight mt-1">
                Offer requests
                <span className="ml-2 text-sm font-bold" style={{ color: theme.warm }}>
                  · {offerRows.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {offerRows.map((b) => {
              const offer = parseOfferFromSpecialRequests(b.special_requests);
              const list =
                b.properties?.price_per_day || b.properties?.price_full_day || offer?.perNight || 0;
              const isBusy = busyId === b.id;
              return (
                <article
                  key={b.id}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'var(--xpx-surface)',
                    border: '1px solid var(--xpx-border-strong)',
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left — guest + headline */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(244,162,97,0.12)', color: theme.warm }}
                        >
                          <Tag className="w-3 h-3" />
                          Offer
                        </span>
                        {b.payment_status === 'offer_countered' && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}
                          >
                            Countered
                          </span>
                        )}
                        <span className="text-xs text-xpx-subtle">
                          {new Date(b.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-lg font-bold text-xpx-text truncate">
                        {b.properties?.title ?? 'Property'}
                      </h3>
                      <p className="text-xs text-xpx-muted">{b.properties?.city ?? ''}</p>

                      {/* Price comparison */}
                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface-light)' }}>
                          <p className="text-[10px] uppercase tracking-wider text-xpx-subtle">Listed</p>
                          <p className="text-base font-bold text-xpx-text mt-0.5">
                            ₹{list.toLocaleString()}
                          </p>
                        </div>
                        <div
                          className="rounded-xl p-3"
                          style={{
                            background: 'rgba(244,162,97,0.10)',
                            border: '1px solid rgba(244,162,97,0.30)',
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: theme.warm }}>
                            Offered
                          </p>
                          <p className="text-base font-extrabold text-xpx-text mt-0.5">
                            ₹{(offer?.perNight ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface-light)' }}>
                          <p className="text-[10px] uppercase tracking-wider text-xpx-subtle">Total</p>
                          <p className="text-base font-bold text-xpx-text mt-0.5">
                            ₹{(offer?.total ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Guest details */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-xpx-muted">
                          <User className="w-4 h-4 text-xpx-subtle" />
                          <span className="text-xpx-text">{b.guest_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xpx-muted truncate">
                          <Mail className="w-4 h-4 text-xpx-subtle flex-shrink-0" />
                          <span className="text-xpx-text truncate">{b.guest_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xpx-muted">
                          <Calendar className="w-4 h-4 text-xpx-subtle" />
                          <span className="text-xpx-text">
                            {new Date(b.check_in_date).toLocaleDateString()} →{' '}
                            {b.check_out_date ? new Date(b.check_out_date).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xpx-muted">
                          <User className="w-4 h-4 text-xpx-subtle" />
                          <span className="text-xpx-text">
                            {b.num_guests} {b.num_guests === 1 ? 'guest' : 'guests'} · {offer?.nights ?? 1}{' '}
                            {(offer?.nights ?? 1) === 1 ? 'night' : 'nights'}
                          </span>
                        </div>
                      </div>

                      {/* Guest note + counter trail */}
                      {(offer?.guestNote || offer?.hostCounter) && (
                        <div
                          className="mt-4 rounded-xl p-3 text-sm space-y-2"
                          style={{ background: 'var(--xpx-surface-light)' }}
                        >
                          {offer?.guestNote && (
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-xpx-subtle flex-shrink-0 mt-0.5" />
                              <p className="text-xpx-text leading-relaxed">{offer.guestNote}</p>
                            </div>
                          )}
                          {offer?.hostCounter && (
                            <p
                              className="text-xs font-semibold flex items-center gap-1.5"
                              style={{ color: '#2563EB' }}
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              You countered with ₹{offer.hostCounter.toLocaleString()}/night
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right — actions */}
                    <div className="flex flex-col gap-2 lg:w-44 lg:flex-shrink-0">
                      <button
                        onClick={() => handleAcceptOffer(b)}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                          background: theme.warm,
                          color: '#ffffff',
                          boxShadow: '0 4px 18px rgba(244,162,97,0.35)',
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          offer && setCounterTarget({ booking: b, offer })
                        }
                        disabled={isBusy || !offer}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 text-xpx-text"
                        style={{
                          background: 'var(--xpx-surface-light)',
                          border: '1px solid var(--xpx-border-strong)',
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                        Counter
                      </button>
                      <button
                        onClick={() => handleRejectOffer(b)}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                        style={{
                          background: 'rgba(220,38,38,0.06)',
                          color: '#B91C1C',
                          border: '1px solid rgba(220,38,38,0.25)',
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────── Filter chips ───────── */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as StatusFilter[]).map((status) => {
          const active = filter === status;
          const count =
            status === 'all'
              ? otherRows.length
              : otherRows.filter((b) => b.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className="px-4 py-2 rounded-full font-medium text-sm transition-colors"
              style={
                active
                  ? { background: theme.warm, color: '#ffffff', border: `1px solid ${theme.warm}` }
                  : {
                      background: 'var(--xpx-surface)',
                      color: 'var(--xpx-text)',
                      border: '1px solid var(--xpx-border-strong)',
                    }
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {' · '}
              {count}
            </button>
          );
        })}
      </div>

      {/* ───────── Bookings list ───────── */}
      {filteredOther.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <BookOpen className="w-16 h-16 text-xpx-subtle mx-auto mb-4" />
          <h3 className="text-xl font-bold text-xpx-text mb-2">No bookings here</h3>
          <p className="text-xpx-muted">
            {filter === 'all'
              ? "You don't have any bookings yet."
              : `No ${filter} bookings at the moment.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOther.map((booking) => {
            const styles = getStatusStyles(booking.status);
            return (
              <div
                key={booking.id}
                className="rounded-2xl p-6"
                style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-xpx-text mb-1">
                          {booking.properties?.title ?? 'Property'}
                        </h3>
                        <p className="text-sm text-xpx-muted">{booking.properties?.city ?? ''}</p>
                      </div>
                      <span
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{ background: styles.bg, color: styles.color }}
                      >
                        <StatusIcon status={booking.status} />
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="xpx-eyebrow mb-2">Guest</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-xpx-text">
                            <User className="w-4 h-4 text-xpx-subtle" />
                            {booking.guest_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-xpx-text truncate">
                            <Mail className="w-4 h-4 text-xpx-subtle flex-shrink-0" />
                            <span className="truncate">{booking.guest_email}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="xpx-eyebrow mb-2">Stay</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-xpx-text">
                            <Calendar className="w-4 h-4 text-xpx-subtle" />
                            {new Date(booking.check_in_date).toLocaleDateString()} →{' '}
                            {booking.check_out_date
                              ? new Date(booking.check_out_date).toLocaleDateString()
                              : '—'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-xpx-text">
                            <User className="w-4 h-4 text-xpx-subtle" />
                            {booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-lg font-bold text-xpx-text">
                        <IndianRupee className="w-5 h-5" />
                        {booking.amount_total?.toLocaleString() || 0}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[11px] px-2 py-1 rounded-full font-semibold"
                          style={
                            booking.payment_status === 'paid'
                              ? { background: 'rgba(22,163,74,0.10)', color: '#15803D' }
                              : booking.payment_status === 'failed'
                              ? { background: 'rgba(220,38,38,0.08)', color: '#B91C1C' }
                              : { background: 'rgba(244,162,97,0.12)', color: theme.warm }
                          }
                        >
                          Payment: {booking.payment_status || 'pending'}
                        </span>
                        {booking.razorpay_payment_id && (
                          <span className="text-[11px] text-xpx-subtle">
                            ID: {booking.razorpay_payment_id.slice(0, 15)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        disabled={busyId === booking.id}
                        className="px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(22,163,74,0.10)', color: '#15803D', border: '1px solid rgba(22,163,74,0.30)' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                        disabled={busyId === booking.id}
                        className="px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(220,38,38,0.06)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.25)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {booking.status === 'confirmed' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        disabled={busyId === booking.id}
                        className="px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.30)' }}
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                        disabled={busyId === booking.id}
                        className="px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(220,38,38,0.06)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.25)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {counterTarget && (
        <CounterOfferDialog
          open={true}
          onClose={() => setCounterTarget(null)}
          guestOfferPerNight={counterTarget.offer.perNight}
          listPricePerNight={
            counterTarget.booking.properties?.price_per_day ||
            counterTarget.booking.properties?.price_full_day ||
            counterTarget.offer.perNight
          }
          nights={counterTarget.offer.nights}
          onSubmit={handleCounterSubmit}
        />
      )}

      <RealtimeToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
