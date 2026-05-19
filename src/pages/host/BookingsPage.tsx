import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import {
  BookOpen,
  Calendar,
  User,
  Mail,
  Phone,
  IndianRupee,
  CheckCircle,
  XCircle,
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
import RejectInquiryDialog from '../../components/RejectInquiryDialog';
import RealtimeToast, { type ToastPayload } from '../../components/RealtimeToast';
import {
  formatGuestPhoneDisplay,
  guestPhoneToE164,
  buildGuestDirectWhatsAppLink,
} from '../../lib/inquiryGuestContact';
import { notifyGuestInquiryDecision } from '../../lib/guestInquiryNotify';
import { theme } from '../../lib/theme';
import HostValueProp from '../../components/host/HostValueProp';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type BookingStatus = BookingRow['status'];

type Booking = BookingRow & {
  properties: {
    title: string;
    city: string;
    price_per_day: number | null;
    price_full_day: number | null;
  } | null;
};

type InquiryTab = 'new' | 'offers' | 'accepted' | 'rejected';

const TABS: { id: InquiryTab; label: string }[] = [
  { id: 'new', label: 'New inquiries' },
  { id: 'offers', label: 'Offers' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

function isOfferInquiry(b: Booking): boolean {
  if (b.inquiry_type === 'make_offer') return true;
  if (
    b.payment_status === 'offer_pending' ||
    b.payment_status === 'offer_countered' ||
    b.payment_status === 'offer_rejected'
  ) {
    return true;
  }
  return /^\s*\[OFFER/i.test(b.special_requests ?? '');
}

function inquiryTabFor(b: Booking): InquiryTab | null {
  if (b.status === 'accepted') return 'accepted';
  if (b.status === 'rejected') return 'rejected';
  if (b.status === 'cancelled' && b.payment_status === 'offer_rejected') return 'rejected';
  if (b.status === 'confirmed' && b.payment_status === 'inquiry') return 'accepted';
  if (b.status === 'confirmed' || b.status === 'completed') return 'accepted';
  if (b.status === 'cancelled') return 'rejected';

  const pending =
    b.status === 'pending_host' || b.status === 'pending' || b.status === 'inquiry_pending';
  if (pending) {
    return isOfferInquiry(b) ? 'offers' : 'new';
  }
  return null;
}

function canHostAct(b: Booking): boolean {
  return (
    b.status === 'pending_host' ||
    b.status === 'pending' ||
    b.status === 'inquiry_pending'
  );
}

/**
 * Inquiries hub — host reviews OTP-verified guest inquiries and offers.
 * Accept sets status `accepted` (no Razorpay). Reject sets `rejected`.
 */
interface BookingsPageProps {
  onNavigate?: (page: string) => void;
}

export default function BookingsPage({ onNavigate }: BookingsPageProps = {}) {
  const { host } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InquiryTab>('new');
  const [counterTarget, setCounterTarget] = useState<{ booking: Booking; offer: ParsedOffer } | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const loadBookings = useCallback(async () => {
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
      console.error('Error loading inquiries:', error);
    } finally {
      setLoading(false);
    }
  }, [host?.id]);

  useEffect(() => {
    if (host?.id) loadBookings();
  }, [host?.id, loadBookings]);

  useEffect(() => {
    if (!host?.id) return;

    const showToast = (row: Partial<Booking>, title: string, body: string) => {
      setToast({
        id: row.id ?? `${Date.now()}`,
        title,
        body,
      });
    };

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
          loadBookings();
          const row = payload.new as Partial<Booking> | undefined;
          if (!row) return;
          const isOffer =
            row.inquiry_type === 'make_offer' ||
            row.payment_status === 'offer_pending' ||
            /^\s*\[OFFER/i.test(row.special_requests ?? '');
          const guestName = row.guest_name || 'A guest';
          showToast(
            row,
            isOffer ? 'New offer received' : 'New inquiry received',
            isOffer
              ? `${guestName} sent you an offer.`
              : `${guestName} sent a booking inquiry.`,
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `host_id=eq.${host.id}`,
        },
        (payload) => {
          loadBookings();
          const row = payload.new as Partial<Booking> | undefined;
          const old = payload.old as Partial<Booking> | undefined;
          if (!row?.id || row.status === old?.status) return;
          if (row.status === 'pending_host' && old?.status !== 'pending_host') {
            const guestName = row.guest_name || 'A guest';
            showToast(row, 'Inquiry updated', `${guestName}'s inquiry was updated.`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host?.id, loadBookings]);

  const tabCounts = useMemo(() => {
    const counts: Record<InquiryTab, number> = { new: 0, offers: 0, accepted: 0, rejected: 0 };
    for (const b of bookings) {
      const t = inquiryTabFor(b);
      if (t) counts[t] += 1;
    }
    return counts;
  }, [bookings]);

  const filtered = useMemo(
    () => bookings.filter((b) => inquiryTabFor(b) === tab),
    [bookings, tab],
  );

  const handleAccept = async (b: Booking) => {
    setBusyId(b.id);
    try {
      const isOffer = isOfferInquiry(b);
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'accepted',
          host_decision_at: new Date().toISOString(),
          ...(isOffer ? { payment_status: 'inquiry' } : {}),
        })
        .eq('id', b.id);
      if (error) throw error;
      notifyGuestInquiryDecision(b, 'accepted', b.properties?.title);
      await loadBookings();
      setTab('accepted');
    } catch (e) {
      console.error('Accept inquiry failed', e);
      alert('Could not accept the inquiry. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectConfirm = async (note: string) => {
    if (!rejectTarget) return;
    const b = rejectTarget;
    setBusyId(b.id);
    try {
      const isOffer = isOfferInquiry(b);
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'rejected',
          host_decision_at: new Date().toISOString(),
          host_decision_note: note || null,
          ...(isOffer ? { payment_status: 'offer_rejected' } : {}),
        })
        .eq('id', b.id);
      if (error) throw error;
      notifyGuestInquiryDecision(b, 'rejected', b.properties?.title);
      setRejectTarget(null);
      await loadBookings();
      setTab('rejected');
    } catch (e) {
      console.error('Reject inquiry failed', e);
      alert('Could not reject the inquiry. Please try again.');
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

  const handleMarkComplete = async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      if (error) throw error;
      await loadBookings();
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('Failed to update booking');
    } finally {
      setBusyId(null);
    }
  };

  const getStatusStyles = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
      case 'inquiry_pending':
      case 'pending_host':
        return { bg: 'rgba(80,200,120,0.12)', color: theme.warm };
      case 'accepted':
      case 'confirmed':
        return { bg: 'rgba(80,200,120,0.10)', color: '#3dae68' };
      case 'rejected':
      case 'cancelled':
        return { bg: 'rgba(220,38,38,0.08)', color: '#B91C1C' };
      case 'completed':
        return { bg: 'rgba(37,99,235,0.10)', color: '#2563EB' };
      default:
        return { bg: 'var(--xpx-surface-light)', color: 'var(--xpx-muted)' };
    }
  };

  const statusLabel = (status: BookingStatus) => {
    if (status === 'pending_host') return 'Awaiting you';
    if (status === 'accepted') return 'Accepted';
    if (status === 'rejected') return 'Rejected';
    return status.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.warm }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight">
          Inquiries
        </h1>
        <p className="text-xpx-muted mt-2 max-w-2xl leading-relaxed">
          0% commission — you accept or reject, then coordinate payment directly (WhatsApp, UPI, or
          cash). We never take a cut of the guest payout.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
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
              {label}
              {' · '}
              {tabCounts[id]}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyInquiries tab={tab} onNavigate={onNavigate} />
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <InquiryCard
              key={booking.id}
              booking={booking}
              tab={tab}
              busyId={busyId}
              getStatusStyles={getStatusStyles}
              statusLabel={statusLabel}
              onAccept={() => handleAccept(booking)}
              onReject={() => setRejectTarget(booking)}
              onCounter={(offer) => setCounterTarget({ booking, offer })}
              onMarkComplete={() => handleMarkComplete(booking.id)}
            />
          ))}
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

      <RejectInquiryDialog
        open={rejectTarget !== null}
        guestName={rejectTarget?.guest_name ?? 'Guest'}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        busy={busyId !== null && rejectTarget !== null}
      />

      <RealtimeToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function EmptyInquiries({
  tab,
  onNavigate,
}: {
  tab: InquiryTab;
  onNavigate?: (page: string) => void;
}) {
  const copy: Record<InquiryTab, { title: string; body: string }> = {
    new: {
      title: 'No new inquiries yet',
      body: 'When guests send book-pay-later inquiries, they land here. You choose accept or reject — payment stays between you and the guest.',
    },
    offers: {
      title: 'No open offers',
      body: 'Price offers from guests show up here. Accept, counter, or reject — then close on WhatsApp.',
    },
    accepted: {
      title: 'No accepted inquiries',
      body: 'Accepted guests get your verified WhatsApp. Collect rent directly — 0% commission to XpressBnB.',
    },
    rejected: {
      title: 'No rejected inquiries',
      body: 'Inquiries you decline are listed here for your records.',
    },
  };
  const { title, body } = copy[tab];
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-8 sm:p-12 text-center"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        }}
      >
        <BookOpen className="w-16 h-16 text-xpx-subtle mx-auto mb-4" />
        <h3 className="text-xl font-bold text-xpx-text mb-2">{title}</h3>
        <p className="text-xpx-muted max-w-md mx-auto leading-relaxed">{body}</p>
      </div>
      <HostValueProp
        variant="minimal"
        showComparison={tab === 'new'}
        showSocialProof={false}
        showUpgradeNudge={tab === 'new'}
        onUpgradeClick={onNavigate ? () => onNavigate('subscription') : undefined}
      />
    </div>
  );
}

function GuestVerifiedPhone({
  booking,
}: {
  booking: Pick<Booking, 'phone_verified' | 'guest_phone' | 'guest_name' | 'properties'>;
}) {
  if (!booking.phone_verified || !booking.guest_phone?.trim()) return null;

  const display = formatGuestPhoneDisplay(booking.guest_phone);
  const tel = guestPhoneToE164(booking.guest_phone);
  const firstName = booking.guest_name.trim().split(/\s+/)[0];
  const wa = buildGuestDirectWhatsAppLink(
    booking.guest_phone,
    booking.properties?.title ?? 'your property',
    firstName,
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Phone className="w-4 h-4 text-xpx-subtle flex-shrink-0" />
      <span className="text-xpx-text font-medium">{display}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-xpx-subtle">
        Verified
      </span>
      <a
        href={`tel:${tel}`}
        className="text-xs font-semibold px-2 py-0.5 rounded-lg"
        style={{ color: theme.warm }}
      >
        Call
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold px-2 py-0.5 rounded-lg"
        style={{ color: '#25D366' }}
      >
        WhatsApp
      </a>
    </div>
  );
}

function InquiryCard({
  booking,
  tab,
  busyId,
  getStatusStyles,
  statusLabel,
  onAccept,
  onReject,
  onCounter,
  onMarkComplete,
}: {
  booking: Booking;
  tab: InquiryTab;
  busyId: string | null;
  getStatusStyles: (s: BookingStatus) => { bg: string; color: string };
  statusLabel: (s: BookingStatus) => string;
  onAccept: () => void;
  onReject: () => void;
  onCounter: (offer: ParsedOffer) => void;
  onMarkComplete: () => void;
}) {
  const offer = parseOfferFromSpecialRequests(booking.special_requests);
  const isOffer = isOfferInquiry(booking);
  const isBusy = busyId === booking.id;
  const styles = getStatusStyles(booking.status);
  const showActions = canHostAct(booking);
  const showOfferActions = tab === 'offers' && showActions;
  const showInquiryActions = tab === 'new' && showActions;
  const list =
    booking.properties?.price_per_day ||
    booking.properties?.price_full_day ||
    offer?.perNight ||
    0;

  return (
    <article
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isOffer && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(80,200,120,0.12)', color: theme.warm }}
              >
                <Tag className="w-3 h-3" />
                Offer
              </span>
            )}
            {booking.payment_status === 'offer_countered' && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}
              >
                Countered
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
              style={{ background: styles.bg, color: styles.color }}
            >
              {statusLabel(booking.status)}
            </span>
            <span className="text-xs text-xpx-subtle">
              {new Date(booking.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h3 className="mt-1.5 text-lg font-bold text-xpx-text truncate">
            {booking.properties?.title ?? 'Property'}
          </h3>
          <p className="text-xs text-xpx-muted">{booking.properties?.city ?? ''}</p>

          {isOffer && offer && (
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
                  background: 'rgba(80,200,120,0.10)',
                  border: '1px solid rgba(80,200,120,0.30)',
                }}
              >
                <p className="text-[10px] uppercase tracking-wider" style={{ color: theme.warm }}>
                  Offered
                </p>
                <p className="text-base font-extrabold text-xpx-text mt-0.5">
                  ₹{(offer.perNight ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface-light)' }}>
                <p className="text-[10px] uppercase tracking-wider text-xpx-subtle">Total</p>
                <p className="text-base font-bold text-xpx-text mt-0.5">
                  ₹{(offer.total ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-xpx-muted">
              <User className="w-4 h-4 text-xpx-subtle" />
              <span className="text-xpx-text">{booking.guest_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xpx-muted truncate">
              <Mail className="w-4 h-4 text-xpx-subtle flex-shrink-0" />
              <span className="text-xpx-text truncate">{booking.guest_email}</span>
            </div>
            <div className="flex items-center gap-2 text-xpx-muted sm:col-span-2">
              <GuestVerifiedPhone booking={booking} />
            </div>
            <div className="flex items-center gap-2 text-xpx-muted">
              <Calendar className="w-4 h-4 text-xpx-subtle" />
              <span className="text-xpx-text">
                {new Date(booking.check_in_date).toLocaleDateString()} →{' '}
                {booking.check_out_date
                  ? new Date(booking.check_out_date).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xpx-muted">
              <User className="w-4 h-4 text-xpx-subtle" />
              <span className="text-xpx-text">
                {booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}
                {offer?.nights != null && (
                  <>
                    {' '}
                    · {offer.nights} {offer.nights === 1 ? 'night' : 'nights'}
                  </>
                )}
              </span>
            </div>
          </div>

          {!isOffer && (
            <div className="mt-3 flex items-center gap-2 text-lg font-bold text-xpx-text">
              <IndianRupee className="w-5 h-5" />
              {(booking.amount_total ?? booking.total_price)?.toLocaleString() ?? '—'}
            </div>
          )}

          {(offer?.guestNote || offer?.hostCounter) && (
            <div
              className="mt-4 rounded-xl p-3 text-sm space-y-2"
              style={{ background: 'var(--xpx-surface-light)' }}
            >
              {offer.guestNote && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-xpx-subtle flex-shrink-0 mt-0.5" />
                  <p className="text-xpx-text leading-relaxed">{offer.guestNote}</p>
                </div>
              )}
              {offer.hostCounter != null && (
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

          {booking.host_decision_note && tab !== 'new' && tab !== 'offers' && (
            <p className="mt-3 text-sm text-xpx-muted italic">
              Your note: {booking.host_decision_note}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:w-48 lg:flex-shrink-0">
          {(showInquiryActions || showOfferActions) && (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{
                  background: theme.warm,
                  color: '#ffffff',
                  boxShadow: '0 4px 18px rgba(80,200,120,0.35)',
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Accept inquiry
              </button>
              {showOfferActions && offer && (
                <button
                  type="button"
                  onClick={() => onCounter(offer)}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 text-xpx-text"
                  style={{
                    background: 'var(--xpx-surface-light)',
                    border: '1px solid var(--xpx-border-strong)',
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                  Counter
                </button>
              )}
              <button
                type="button"
                onClick={onReject}
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
            </>
          )}

          {tab === 'accepted' &&
            (booking.status === 'confirmed' || booking.status === 'accepted') &&
            booking.status !== 'completed' && (
              <button
                type="button"
                onClick={onMarkComplete}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  color: '#2563EB',
                  border: '1px solid rgba(37,99,235,0.30)',
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Mark complete
              </button>
            )}
        </div>
      </div>
    </article>
  );
}
