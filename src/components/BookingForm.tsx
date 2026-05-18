import { useMemo, useState } from 'react';
import {
  Calendar,
  Users,
  Mail,
  Phone,
  User,
  MessageSquare,
  Sparkles,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import type { Property } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { applyDiscounts, findPromoCode, type PromoCodeDef } from '../lib/offers';
import { safeHostDisplayName } from '../lib/host';
import { saveBookingConfirmationSnapshot } from '../lib/bookingConfirmationStorage';
import type { RazorpayPaymentResponse } from '../lib/razorpay';
import '../lib/razorpay';

export type BookingFormSuccessDetail = { bookingId: string };

type HostContact = {
  name: string;
  phone: string;
};

interface BookingFormProps {
  property: Property;
  onSuccess: (detail: BookingFormSuccessDetail) => void;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  calculatedPrice: number;
  initialNumGuests?: number;
}

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7309/ingest/3b31d44b-bafe-4429-b25d-b5d1550a4355';

function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) return;
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'd0209f',
    },
    body: JSON.stringify({
      sessionId: 'd0209f',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 12,
        padding: '12px 16px',
        marginTop: 12,
        fontSize: 14,
        color: '#991B1B',
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}

export default function BookingForm({
  property,
  onSuccess,
  checkInDate,
  checkOutDate,
  calculatedPrice,
  initialNumGuests,
}: BookingFormProps) {
  const [includeDecoration, setIncludeDecoration] = useState(false);
  const [formData, setFormData] = useState(() => {
    const cap = Math.max(1, property.max_guests || 1);
    const n = initialNumGuests != null ? initialNumGuests : 1;
    return {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      num_guests: Math.min(Math.max(1, n), cap),
      special_requests: '',
    };
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [hostContact, setHostContact] = useState<HostContact | null>(null);
  const [completedBookingId, setCompletedBookingId] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeDef | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const calculateNumberOfDays = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const numberOfDays = calculateNumberOfDays();
  const decorationPrice = includeDecoration ? 2000 : 0;

  const discountResult = useMemo(
    () => applyDiscounts(calculatedPrice, property, appliedPromo),
    [calculatedPrice, property, appliedPromo],
  );
  const totalPrice = discountResult.total + decorationPrice;
  const totalSaved = discountResult.propertyDiscount + discountResult.promoDiscount;

  const handleApplyPromo = () => {
    setPromoError(null);
    const promo = findPromoCode(promoInput);
    if (!promo) {
      setPromoError('Invalid promo code.');
      setAppliedPromo(null);
      return;
    }
    if (promo.minSubtotal && calculatedPrice < promo.minSubtotal) {
      setPromoError(
        `This code requires a subtotal of at least ₹${promo.minSubtotal.toLocaleString()}.`,
      );
      return;
    }
    setAppliedPromo(promo);
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const validateForm = (): string | null => {
    if (!checkInDate || !checkOutDate) {
      return 'Please select check-in and check-out dates from the calendar above.';
    }
    if (checkOutDate <= checkInDate) {
      return 'Check-out must be after check-in.';
    }
    if (!formData.guest_name.trim() || !formData.guest_email.trim() || !formData.guest_phone.trim()) {
      return 'Please fill all fields';
    }
    const phoneDigits = normalizePhoneDigits(formData.guest_phone);
    if (phoneDigits.length !== 10) {
      return 'Please enter a valid 10-digit phone number';
    }
    if (totalPrice <= 0) {
      return 'Invalid booking total. Please reselect your dates.';
    }
    return null;
  };

  const assertDatesAvailable = async (checkIn: string, checkOut: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_property_available', {
      p_property_id: property.id,
      p_check_in: checkIn,
      p_check_out: checkOut,
    });

    if (error) {
      debugLog('D', 'BookingForm.tsx:availability', 'rpc failed', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }

    return Boolean(data);
  };

  const fetchHostContact = async (hostId: string): Promise<HostContact | null> => {
    const { data, error } = await supabase
      .from('hosts')
      .select('name, phone')
      .eq('id', hostId)
      .maybeSingle();

    if (error) {
      debugLog('E', 'BookingForm.tsx:host', 'host fetch failed', {
        code: error.code,
        message: error.message,
      });
      return null;
    }
    if (!data) return null;
    return {
      name: safeHostDisplayName(data.name, 'Your Host'),
      phone: data.phone?.trim() ?? '',
    };
  };

  const openRazorpayCheckout = (
    bookingId: string,
    orderId: string,
    checkIn: string,
    checkOut: string,
  ) => {
    if (typeof window.Razorpay === 'undefined') {
      throw new Error('Payment system failed to load. Please refresh and try again.');
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      throw new Error('Payment is not configured. Please contact support.');
    }

    const options = {
      key: razorpayKey,
      name: 'XpressBnB',
      description: `Booking — ${property.title}`,
      order_id: orderId,
      prefill: {
        name: formData.guest_name,
        email: formData.guest_email,
        contact: normalizePhoneDigits(formData.guest_phone),
      },
      theme: { color: '#059669' },
      handler: async (response: RazorpayPaymentResponse) => {
        try {
          const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`;
          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: bookingId,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({}));
          debugLog('C', 'BookingForm.tsx:verify', 'verify response', {
            ok: verifyRes.ok,
            success: verifyData?.success,
          });

          if (!verifyRes.ok || !verifyData?.success) {
            setErrorMessage(
              verifyData?.message || 'Payment verification failed. Contact support with your booking reference.',
            );
            setLoading(false);
            return;
          }

          let contact: HostContact | null = null;
          if (verifyData.host?.phone) {
            contact = {
              name: safeHostDisplayName(verifyData.host.name, 'Your Host'),
              phone: String(verifyData.host.phone).trim(),
            };
          } else if (property.host_id) {
            contact = await fetchHostContact(property.host_id);
          }

          setHostContact(contact);
          setCompletedBookingId(bookingId);
          setBookingSuccess(true);

          saveBookingConfirmationSnapshot({
            v: 1,
            savedAt: Date.now(),
            bookingId,
            propertyId: property.id,
            propertyTitle: property.title,
            propertyCity: property.city,
            propertySlug: property.slug ?? null,
            checkIn,
            checkOut,
            numGuests: formData.num_guests,
            estimatedTotal: totalPrice,
            guestEmail: formData.guest_email,
            hostContactName: contact?.name ?? null,
            hostContactPhone: contact?.phone ?? null,
            includeDecoration,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
          });

          setLoading(false);
        } catch (err) {
          console.error('Payment verification error:', err);
          setErrorMessage(
            err instanceof Error ? err.message : 'Payment verification failed. Please contact support.',
          );
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setErrorMessage('Payment cancelled');
          setLoading(false);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', () => {
      setErrorMessage('Payment failed. Please try again.');
      setLoading(false);
    });
    razorpay.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!checkInDate || !checkOutDate) return;

    setLoading(true);
    const checkIn = formatDate(checkInDate);
    const checkOut = formatDate(checkOutDate);

    debugLog('A', 'BookingForm.tsx:submit', 'submit started', {
      propertyId: property.id,
      checkIn,
      checkOut,
      totalPrice,
    });

    try {
      const available = await assertDatesAvailable(checkIn, checkOut);
      if (!available) {
        setErrorMessage('Booking unavailable');
        setLoading(false);
        return;
      }

      const bookingData = {
        property_id: property.id,
        host_id: property.host_id,
        guest_name: formData.guest_name.trim(),
        guest_email: formData.guest_email.trim(),
        guest_phone: normalizePhoneDigits(formData.guest_phone),
        check_in_date: checkIn,
        check_out_date: checkOut,
        checkin: checkIn,
        checkout: checkOut,
        num_guests: formData.num_guests,
        booking_type: 'full_day' as const,
        amount_total: totalPrice,
        total_price: totalPrice,
        nights: numberOfDays,
        status: 'pending' as const,
        payment_status: 'pending',
        special_requests: formData.special_requests.trim() || null,
        include_decoration: includeDecoration,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single();

      if (insertError) {
        debugLog('A', 'BookingForm.tsx:insert', 'insert failed', {
          code: insertError.code,
          message: insertError.message,
        });
        if (import.meta.env.DEV) console.error('Booking insert error:', insertError);
        const msg = insertError.message?.toLowerCase() ?? '';
        if (msg.includes('column') || insertError.code === 'PGRST204') {
          setErrorMessage(
            'Booking could not be saved (database schema mismatch). Run the latest Supabase migrations and try again.',
          );
        } else {
          setErrorMessage(`Failed to create booking: ${insertError.message}`);
        }
        setLoading(false);
        return;
      }

      const bookingId = inserted?.id;
      if (!bookingId) {
        setErrorMessage('Booking was created but we could not continue to payment. Please contact support.');
        setLoading(false);
        return;
      }

      debugLog('A', 'BookingForm.tsx:insert', 'insert ok', { bookingId });

      const orderUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`;
      let orderResponse: Response;
      try {
        orderResponse = await fetch(orderUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalPrice,
            currency: 'INR',
            receipt: `booking_${bookingId}`,
            notes: {
              booking_id: bookingId,
              property_id: property.id,
            },
          }),
        });
      } catch {
        debugLog('B', 'BookingForm.tsx:order', 'fetch threw', { bookingId });
        setErrorMessage('Network error');
        setLoading(false);
        return;
      }

      const orderData = await orderResponse.json().catch(() => ({}));
      debugLog('B', 'BookingForm.tsx:order', 'order response', {
        ok: orderResponse.ok,
        hasOrder: Boolean(orderData?.order?.id),
      });

      if (!orderResponse.ok || !orderData?.order?.id) {
        if (import.meta.env.DEV) console.error('Order creation failed:', orderData);
        setErrorMessage(
          orderData?.message || orderData?.error || 'Could not start payment. Please try again.',
        );
        setLoading(false);
        return;
      }

      await supabase
        .from('bookings')
        .update({ razorpay_order_id: orderData.order.id })
        .eq('id', bookingId);

      openRazorpayCheckout(bookingId, orderData.order.id, checkIn, checkOut);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Booking error:', error);
      debugLog('A', 'BookingForm.tsx:submit', 'unexpected error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
      setLoading(false);
    }
  };

  if (bookingSuccess && completedBookingId) {
    const hostInitial = hostContact?.name?.charAt(0)?.toUpperCase() || 'H';
    const hostPhoneDigits = hostContact?.phone?.replace(/\D/g, '') ?? '';

    return (
      <div
        style={{
          textAlign: 'center',
          padding: '24px 0',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#ECFDF5',
            border: '2px solid #059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            color: '#059669',
            fontWeight: 800,
          }}
        >
          ✓
        </div>

        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#111827',
            marginBottom: 4,
          }}
        >
          Booking Confirmed!
        </h3>

        <p
          style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 24,
          }}
        >
          Your stay is confirmed. Contact your host directly.
        </p>

        {hostContact && (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#6B7280',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              YOUR HOST
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {hostInitial}
              </div>

              <div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 2,
                  }}
                >
                  {hostContact.name || 'Your Host'}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: '#059669',
                    fontWeight: 600,
                  }}
                >
                  Verified Host ✓
                </p>
              </div>
            </div>

            {hostContact.phone ? (
              <>
                <a
                  href={`tel:${hostContact.phone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: 14,
                    background: '#059669',
                    color: 'white',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: 'none',
                    marginBottom: 8,
                  }}
                >
                  Call Host: {hostContact.phone}
                </a>
                <a
                  href={`https://wa.me/91${hostPhoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: 14,
                    background: '#25D366',
                    color: 'white',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: 'none',
                  }}
                >
                  WhatsApp Host
                </a>
              </>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: 'center',
                  padding: 12,
                }}
              >
                Host will contact you within 30 minutes
              </p>
            )}
          </div>
        )}

        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: 16,
            textAlign: 'left',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#6B7280',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            BOOKING SUMMARY
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#374151',
              marginBottom: 6,
            }}
          >
            <span>Property</span>
            <span style={{ fontWeight: 600 }}>{property.title}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#374151',
              marginBottom: 6,
            }}
          >
            <span>Check-in</span>
            <span style={{ fontWeight: 600 }}>
              {checkInDate?.toLocaleDateString('en-IN')}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#374151',
              paddingTop: 8,
              borderTop: '1px solid #E2E8F0',
              marginTop: 4,
            }}
          >
            <span style={{ fontWeight: 700 }}>Total Paid</span>
            <span style={{ fontWeight: 800, color: '#059669' }}>
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSuccess({ bookingId: completedBookingId })}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          View full confirmation
        </button>

        <p
          style={{
            fontSize: 12,
            color: '#9CA3AF',
            lineHeight: 1.5,
          }}
        >
          Your booking is confirmed and secured. A confirmation will be sent to your email.
        </p>
      </div>
    );
  }

  const guestCap = Math.max(1, property.max_guests || 1);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {checkInDate && checkOutDate && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Selected Dates
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Check-in</p>
              <p className="font-bold text-gray-900">
                {checkInDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Check-out</p>
              <p className="font-bold text-gray-900">
                {checkOutDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl p-3">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="font-bold text-blue-600">
              {numberOfDays} {numberOfDays === 1 ? 'Night' : 'Nights'}
            </span>
          </div>
        </div>
      )}

      {!checkInDate || !checkOutDate ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
            !
          </div>
          <div>
            <p className="font-semibold text-amber-900">Please select dates</p>
            <p className="text-sm text-amber-700 mt-1">
              Use the calendar above to select your check-in and check-out dates before
              completing the booking form.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.guest_email}
            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1" />
            Phone Number
          </label>
          <input
            type="tel"
            required
            value={formData.guest_phone}
            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Number of Guests
          </label>
          <select
            value={formData.num_guests}
            onChange={(e) =>
              setFormData({ ...formData, num_guests: parseInt(e.target.value, 10) })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          >
            {Array.from({ length: guestCap }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
        <label className="flex items-start gap-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDecoration}
            onChange={(e) => setIncludeDecoration(e.target.checked)}
            className="w-5 h-5 mt-1 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-gray-900">Add Decoration Service</span>
              <span className="ml-auto text-lg font-bold text-amber-600">₹2,000</span>
            </div>
            <p className="text-sm text-gray-600">
              Professional decoration setup for your special occasion. Includes balloons,
              banners, and themed decorations.
            </p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Special Requests (Optional)
        </label>
        <textarea
          value={formData.special_requests}
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
          placeholder="Any special requirements or requests..."
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900">Have a promo code?</h4>
          {appliedPromo && (
            <button
              type="button"
              onClick={handleClearPromo}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
        {appliedPromo ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-3">
            <Tag className="w-4 h-4 text-emerald-700 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">
                Code <span className="font-mono">{appliedPromo.code}</span> applied
              </p>
              <p className="text-xs">{appliedPromo.label}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase tracking-wide text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
        {promoError && <p className="mt-2 text-xs text-red-600">{promoError}</p>}
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <h4 className="font-bold text-gray-900 mb-4">Price Summary</h4>
        <div className="space-y-3">
          {numberOfDays > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Property Price ({numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'}):
              </span>
              <span className="font-semibold text-gray-900">
                ₹{calculatedPrice.toLocaleString()}
              </span>
            </div>
          )}
          {discountResult.propertyDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-700">
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Property offer
              </span>
              <span className="font-semibold">
                −₹{discountResult.propertyDiscount.toLocaleString()}
              </span>
            </div>
          )}
          {discountResult.promoDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-700">
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Promo {discountResult.promoCodeApplied}
              </span>
              <span className="font-semibold">
                −₹{discountResult.promoDiscount.toLocaleString()}
              </span>
            </div>
          )}
          {includeDecoration && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Decoration Service:
              </span>
              <span className="font-semibold text-amber-600">
                ₹{decorationPrice.toLocaleString()}
              </span>
            </div>
          )}
          <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
            <span className="text-gray-900 font-bold text-lg">Total Amount:</span>
            <span className="text-3xl font-bold text-gray-900">
              ₹{totalPrice.toLocaleString()}
            </span>
          </div>
          {totalSaved > 0 && numberOfDays > 0 && (
            <p className="text-xs font-semibold text-emerald-700 text-right">
              You save ₹{totalSaved.toLocaleString()} on this booking
            </p>
          )}
        </div>
        {numberOfDays === 0 && (
          <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select dates in the calendar above to see pricing
          </p>
        )}
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} />}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        style={{
          background: loading ? '#047857' : '#059669',
        }}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay & Confirm Booking'
        )}
      </button>

      <p className="text-sm text-gray-500 text-center">
        Secure payment powered by Razorpay. Your card details are never stored on our
        servers.
      </p>
    </form>
  );
}
