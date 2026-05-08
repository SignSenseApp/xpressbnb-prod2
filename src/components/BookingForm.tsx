import { useMemo, useState } from 'react';
import { Calendar, Users, Mail, Phone, User, MessageSquare, Sparkles, Copy, Check, Tag, X } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { applyDiscounts, findPromoCode, type PromoCodeDef } from '../lib/offers';
import { safeHostDisplayName } from '../lib/host';
import { TEAM_PHONE_DISPLAY, TEAM_PHONE_E164, buildHostWhatsAppLink } from '../lib/team';

interface BookingFormProps {
  property: Property;
  onSuccess: () => void;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  calculatedPrice: number;
  /** Prefill guest count from search URL */
  initialNumGuests?: number;
}

interface HostContact {
  email: string;
  phone: string;
  name: string;
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
  const [success, setSuccess] = useState(false);
  const [hostContact, setHostContact] = useState<HostContact | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const calculateNumberOfDays = () => {
    if (!checkInDate || !checkOutDate) {
      return 0;
    }
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  // Promo code state — kept local; the actual discount is computed from
  // src/lib/offers.ts so the math is shared with the property page.
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeDef | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const numberOfDays = calculateNumberOfDays();
  const decorationPrice = includeDecoration ? 2000 : 0;

  // Apply property-level offer + promo to the nightly subtotal first, then add
  // decoration on top so guests can see an itemized, transparent price.
  const discountResult = useMemo(
    () => applyDiscounts(calculatedPrice, property, appliedPromo),
    [calculatedPrice, property, appliedPromo],
  );
  const discountedSubtotal = discountResult.total;
  const totalPrice = discountedSubtotal + decorationPrice;
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkInDate || !checkOutDate) {
      alert('Please select check-in and check-out dates from the calendar above.');
      return;
    }

    setLoading(true);

    try {
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Insert is typed against the bookings Insert row, so booking_type and
      // status need their literal types preserved (TS can't narrow a string
      // literal inside an object literal without `as const`).
      const bookingData = {
        property_id: property.id,
        host_id: property.host_id,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        check_in_date: formatDate(checkInDate),
        check_out_date: formatDate(checkOutDate),
        checkin: formatDate(checkInDate),
        checkout: formatDate(checkOutDate),
        num_guests: formData.num_guests,
        booking_type: 'full_day' as const,
        amount_total: totalPrice,
        total_price: totalPrice,
        status: 'confirmed' as const,
        payment_status: 'pending',
        special_requests: formData.special_requests || null,
      };

      const { error } = await supabase.from('bookings').insert(bookingData);

      if (error) {
        console.error('Booking error details:', error);
        alert(`Failed to create booking: ${error.message}`);
        setLoading(false);
        return;
      }

      // Skip host fetch when host_id is null (orphaned property); UI degrades gracefully.
      if (!property.host_id) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      const { data: hostData, error: hostError } = await supabase
        .from('hosts')
        .select('email, phone, name')
        .eq('id', property.host_id)
        .maybeSingle();

      if (hostError) {
        console.error('Error fetching host contact:', hostError);
      }

      if (hostData) {
        // Sanitize name through safeHostDisplayName so a phone-in-name leak
        // never reaches the guest. Phone is captured but not displayed.
        setHostContact({
          email: hostData.email,
          phone: hostData.phone || 'Not provided',
          name: safeHostDisplayName(hostData.name, 'Host'),
        });
      }

      setSuccess(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Booking error:', error);
      alert(`Failed to create booking: ${error.message || 'Please try again.'}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 py-6">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.4)' }}
          >
            <svg className="w-10 h-10" style={{ color: '#3dae68' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-extrabold text-xpx-text mb-2">Booking Request Submitted!</h3>
          <p className="text-xpx-muted mb-6">Your booking request has been sent to the host. Please contact them directly to confirm and arrange payment.</p>
        </div>

        {hostContact && (
          <div
            className="rounded-2xl p-6"
            style={{
              background:
                'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface-light) 100%)',
              border: '1px solid var(--xpx-border-strong)',
            }}
          >
            <h4 className="text-lg font-bold text-xpx-text mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Your host
            </h4>

            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--xpx-surface)' }}>
                <p className="text-xs uppercase tracking-wide text-xpx-subtle mb-1">Host Name</p>
                <p className="font-semibold text-xpx-text">{hostContact.name}</p>
              </div>

              {/* Host's "direct" contact line. Behind the scenes this routes
                  through the central team line (see src/lib/team.ts). The
                  guest perceives it as the host's number, the boss receives
                  the call and brokers the booking. */}
              <div className="rounded-xl p-4" style={{ background: 'var(--xpx-surface)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-xpx-subtle mb-1">Host&apos;s contact</p>
                    <p className="font-semibold text-xpx-text">{TEAM_PHONE_DISPLAY}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <a
                      href={buildHostWhatsAppLink(property.title, hostContact.name.split(' ')[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg transition-colors text-xpx-text hover:bg-slate-100"
                      title="WhatsApp host"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </a>
                    <a
                      href={`tel:${TEAM_PHONE_E164}`}
                      className="p-2 rounded-lg transition-colors text-xpx-text hover:bg-slate-100"
                      title="Call host"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(TEAM_PHONE_DISPLAY)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-xpx-text"
                      title="Copy number"
                    >
                      {copiedEmail ? (
                        <Check className="w-5 h-5" style={{ color: '#3dae68' }} />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="mt-6 p-4 rounded-xl"
              style={{
                background: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.25)',
              }}
            >
              <p className="text-sm text-blue-900">
                <strong>What&apos;s next:</strong> Reach out on WhatsApp or call to confirm dates and arrange payment. Your host typically replies within an hour.
              </p>
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
        >
          <h5 className="font-semibold text-xpx-text mb-3">Booking Summary</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-xpx-muted">Property:</span><span className="font-medium text-xpx-text">{property.title}</span></div>
            <div className="flex justify-between"><span className="text-xpx-muted">Check-in:</span><span className="font-medium text-xpx-text">{checkInDate?.toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-xpx-muted">Check-out:</span><span className="font-medium text-xpx-text">{checkOutDate?.toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-xpx-muted">Guests:</span><span className="font-medium text-xpx-text">{formData.num_guests}</span></div>
            <div className="flex justify-between pt-2 xpx-divider">
              <span className="text-xpx-text font-semibold">Estimated Total:</span>
              <span className="text-lg font-bold text-xpx-text">₹{totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSuccess}
          className="w-full py-3 font-semibold rounded-xl transition-all"
          style={{ background: 'var(--accent)', color: '#ffffff', boxShadow: '0 6px 24px rgba(80,200,120,0.32)' }}
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {checkInDate && checkOutDate && (
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface-light) 100%)',
            border: '1px solid var(--xpx-border-strong)',
          }}
        >
          <h4 className="text-sm font-bold text-xpx-text mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Selected Dates
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
              <p className="text-xs text-xpx-subtle mb-1">Check-in</p>
              <p className="font-bold text-xpx-text">{checkInDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
              <p className="text-xs text-xpx-subtle mb-1">Check-out</p>
              <p className="font-bold text-xpx-text">{checkOutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
            <span className="text-sm text-xpx-muted">Duration:</span>
            <span className="font-bold" style={{ color: 'var(--accent-dark)' }}>{numberOfDays} {numberOfDays === 1 ? 'Night' : 'Nights'}</span>
          </div>
        </div>
      )}

      {!checkInDate || !checkOutDate ? (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: 'rgba(80,200,120,0.10)',
            border: '1px solid rgba(80,200,120,0.32)',
          }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: 'var(--accent)', color: '#ffffff' }}>!</div>
          <div>
            <p className="font-semibold text-xpx-text">Please select dates</p>
            <p className="text-sm text-xpx-muted mt-1">Use the calendar above to select your check-in and check-out dates before completing the booking form.</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            className="xpx-input"
            placeholder="John Doe"
            autoComplete="name"
            autoCapitalize="words"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.guest_email}
            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
            className="xpx-input"
            placeholder="john@example.com"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            <Phone className="w-4 h-4 inline mr-1" />
            Phone Number
          </label>
          <input
            type="tel"
            required
            value={formData.guest_phone}
            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
            className="xpx-input"
            placeholder="+91 98765 43210"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Number of Guests
          </label>
          <select
            value={formData.num_guests}
            onChange={(e) => setFormData({ ...formData, num_guests: parseInt(e.target.value) })}
            className="xpx-input"
          >
            {Array.from({ length: property.max_guests }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(80,200,120,0.12) 0%, var(--xpx-surface-light) 100%)',
          border: '1px solid var(--xpx-border-strong)',
        }}
      >
        <label className="flex items-start gap-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDecoration}
            onChange={(e) => setIncludeDecoration(e.target.checked)}
            className="w-5 h-5 mt-1 rounded accent-[var(--accent)]"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span className="font-bold text-xpx-text">Add Decoration Service</span>
              <span className="ml-auto text-lg font-bold" style={{ color: 'var(--accent-dark)' }}>₹2,000</span>
            </div>
            <p className="text-sm text-xpx-muted">
              Professional decoration setup for your special occasion. Includes balloons, banners, and themed decorations.
            </p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Special Requests (Optional)
        </label>
        <textarea
          value={formData.special_requests}
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          rows={3}
          className="xpx-input resize-none"
          placeholder="Any special requirements or requests..."
        />
      </div>

      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-xpx-text">Have a promo code?</h4>
          {appliedPromo && (
            <button
              type="button"
              onClick={handleClearPromo}
              className="text-xs font-semibold text-xpx-muted hover:text-xpx-text inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
        {appliedPromo ? (
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{
              background: 'rgba(80,200,120,0.10)',
              border: '1px solid rgba(80,200,120,0.4)',
            }}
          >
            <Tag className="w-4 h-4 mt-0.5" style={{ color: '#3dae68' }} />
            <div className="text-sm" style={{ color: '#14532D' }}>
              <p className="font-semibold">
                Code <span className="font-mono">{appliedPromo.code}</span> applied
              </p>
              <p className="text-xs opacity-80">{appliedPromo.label}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle" />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="xpx-input pl-9 uppercase tracking-wide"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(80,200,120,0.12)',
                color: 'var(--accent-dark)',
                border: '1px solid rgba(80,200,120,0.4)',
              }}
            >
              Apply
            </button>
          </div>
        )}
        {promoError && (
          <p className="mt-2 text-xs" style={{ color: '#B91C1C' }}>{promoError}</p>
        )}
      </div>

      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--xpx-surface-elevated)', border: '1px solid var(--xpx-border-strong)' }}
      >
        <h4 className="font-bold text-xpx-text mb-4">Price Summary</h4>
        <div className="space-y-3">
          {numberOfDays > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xpx-muted">
                Property Price ({numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'}):
              </span>
              <span className="font-semibold text-xpx-text">₹{calculatedPrice.toLocaleString()}</span>
            </div>
          )}
          {discountResult.propertyDiscount > 0 && (
            <div className="flex justify-between items-center" style={{ color: '#3dae68' }}>
              <span className="flex items-center gap-2"><Tag className="w-4 h-4" />Property offer</span>
              <span className="font-semibold">−₹{discountResult.propertyDiscount.toLocaleString()}</span>
            </div>
          )}
          {discountResult.promoDiscount > 0 && (
            <div className="flex justify-between items-center" style={{ color: '#3dae68' }}>
              <span className="flex items-center gap-2"><Tag className="w-4 h-4" />Promo {discountResult.promoCodeApplied}</span>
              <span className="font-semibold">−₹{discountResult.promoDiscount.toLocaleString()}</span>
            </div>
          )}
          {includeDecoration && (
            <div className="flex justify-between items-center">
              <span className="text-xpx-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Decoration Service:
              </span>
              <span className="font-semibold" style={{ color: 'var(--accent-dark)' }}>₹{decorationPrice.toLocaleString()}</span>
            </div>
          )}
          <div className="pt-3 xpx-divider flex justify-between items-center">
            <span className="text-xpx-text font-bold text-lg">Total Amount:</span>
            <span className="text-3xl font-extrabold text-xpx-text">₹{totalPrice.toLocaleString()}</span>
          </div>
          {totalSaved > 0 && numberOfDays > 0 && (
            <p className="text-xs font-semibold text-right" style={{ color: '#3dae68' }}>
              You save ₹{totalSaved.toLocaleString()} on this booking
            </p>
          )}
        </div>
        {numberOfDays === 0 && (
          <p className="text-sm mt-3 flex items-center gap-2" style={{ color: 'var(--accent-dark)' }}>
            <Calendar className="w-4 h-4" />
            Select dates in the calendar above to see pricing
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--xpx-cta)',
          color: '#ffffff',
          boxShadow: '0 8px 32px rgba(255,56,92,0.32)',
        }}
      >
        {loading ? 'Submitting...' : 'Submit Booking Request'}
      </button>

      <p className="text-sm text-xpx-subtle text-center">
        After submitting, you'll receive the host's contact information to arrange payment directly.
      </p>
    </form>
  );
}
