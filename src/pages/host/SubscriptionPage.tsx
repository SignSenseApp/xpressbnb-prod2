import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, Crown, Zap, Loader2, Building2, Sparkles } from 'lucide-react';
import PropertyUpgradeModal from '../../components/PropertyUpgradeModal';
import '../../lib/razorpay';
import { startHostSubscriptionCheckout } from '../../lib/hostSubscriptionCheckout';
import {
  formatInr,
  subscriptionAmountInr,
  yearlyEffectiveMonthlyInr,
  type HostBillingCycle,
  type HostPlanTier,
} from '../../lib/hostSubscriptionPricing';
import { PREMIUM_FEATURE_FLAGS } from '../../lib/subscriptionFeatures';
import HostValueProp from '../../components/host/HostValueProp';

interface PropertySubscriptionWithProperty {
  id: string;
  subscription_status: string;
  subscription_plan: string;
  plan_tier: string;
  subscription_end_date: string | null;
  properties: {
    id: string;
    title: string;
    city: string;
    state: string;
    images: string[] | null;
  } | null;
}

type PaidPlanId = 'standard_999' | 'premium_2999';

function parseUrlParams(): { propertyId: string | null; tier: PaidPlanId | null } {
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('property');
  const tier = params.get('tier');
  if (tier === 'standard_999' || tier === 'premium_2999') {
    return { propertyId, tier };
  }
  return { propertyId, tier: null };
}

function tierLabel(tier: string): string {
  if (tier === 'premium_2999') return 'Premium';
  if (tier === 'standard_999') return 'Standard';
  return 'Free';
}

export default function SubscriptionPage() {
  const { host } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [pendingPlanTier, setPendingPlanTier] = useState<PaidPlanId>('standard_999');
  const [billingCycle, setBillingCycle] = useState<HostBillingCycle>('monthly');
  const [propertySubscriptions, setPropertySubscriptions] = useState<PropertySubscriptionWithProperty[]>([]);

  const loadPropertySubscriptions = useCallback(async () => {
    if (!host?.id) return;

    try {
      const { data, error: loadError } = await supabase
        .from('property_subscriptions')
        .select(`
          *,
          properties:property_id (
            id,
            title,
            city,
            state,
            images
          )
        `)
        .eq('host_id', host.id)
        .order('created_at', { ascending: false });

      if (loadError) throw loadError;
      setPropertySubscriptions((data ?? []) as unknown as PropertySubscriptionWithProperty[]);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    }
  }, [host?.id]);

  useEffect(() => {
    if (host?.id) {
      loadPropertySubscriptions();
    }
  }, [host?.id, loadPropertySubscriptions]);

  const urlCheckoutStarted = useRef(false);

  useEffect(() => {
    if (!host?.id || urlCheckoutStarted.current) return;
    const { propertyId, tier } = parseUrlParams();
    if (!propertyId) return;
    urlCheckoutStarted.current = true;
    const plan = tier ?? 'standard_999';
    setPendingPlanTier(plan);
    void runCheckout(propertyId, plan, billingCycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link checkout once
  }, [host?.id]);

  const runCheckout = async (
    propertyId: string,
    planTier: PaidPlanId,
    cycle: HostBillingCycle,
  ) => {
    if (!host) return;

    setProcessing(true);
    setError(null);

    try {
      await startHostSubscriptionCheckout({
        propertyId,
        planTier,
        billingCycle: cycle,
        host: {
          id: host.id,
          name: host.name,
          email: host.email,
          phone: host.phone,
        },
        onError: setError,
        onSuccess: async () => {
          await loadPropertySubscriptions();
          setError(null);
          window.history.replaceState({}, '', window.location.pathname);
          alert('Subscription activated successfully!');
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectPlan = (planTier: PaidPlanId) => {
    setPendingPlanTier(planTier);
    setShowPropertyModal(true);
  };

  const handlePropertySelected = async (propertyId: string) => {
    await runCheckout(propertyId, pendingPlanTier, billingCycle);
  };

  const activePremiumCount = propertySubscriptions.filter(
    (sub) => sub.subscription_status === 'active',
  ).length;

  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      monthlyInr: 0,
      description: 'Your first listing — no commission, ever',
      features: [
        '0% commission on guest payouts',
        'Accept or reject every inquiry',
        'Direct WhatsApp after you accept',
        'Email notifications',
      ],
      limitations: ['No calendar sync', 'No analytics', 'No verified badge', 'No featured placement'],
      cta: 'Current Plan',
      recommended: false,
    },
    {
      id: 'standard_999' as const,
      name: 'Standard',
      monthlyInr: 999,
      description: 'Essential tools per property',
      features: [
        'Everything in Free',
        'Priority email support',
        'Listing performance basics',
        'Per-property billing',
      ],
      limitations: ['Advanced analytics (Premium)', 'Verified badge (Premium)'],
      cta: 'Upgrade to Standard',
      recommended: true,
    },
    {
      id: 'premium_2999' as const,
      name: 'Premium',
      monthlyInr: 2999,
      description: 'Advanced growth features per property',
      features: [
        'Everything in Standard',
        {
          label: 'Advanced analytics & insights',
          comingSoon: !PREMIUM_FEATURE_FLAGS.analytics,
        },
        {
          label: 'Calendar sync (Airbnb, Booking.com)',
          comingSoon: !PREMIUM_FEATURE_FLAGS.calendarSync,
        },
        {
          label: 'Verified badge on listings',
          comingSoon: !PREMIUM_FEATURE_FLAGS.verifiedBadge,
        },
        {
          label: 'Featured placement',
          comingSoon: !PREMIUM_FEATURE_FLAGS.featured,
        },
      ],
      limitations: [] as string[],
      cta: 'Upgrade to Premium',
      recommended: false,
    },
  ];

  const displayPrice = (monthlyInr: number, planId: PaidPlanId | 'free') => {
    if (planId === 'free') return { main: '₹0', sub: '' };
    const tier = planId as HostPlanTier;
    if (billingCycle === 'monthly') {
      return { main: `₹${formatInr(monthlyInr)}`, sub: '/mo per property' };
    }
    const yearlyTotal = subscriptionAmountInr(tier, 'yearly');
    const perMonth = yearlyEffectiveMonthlyInr(tier);
    return {
      main: `₹${formatInr(yearlyTotal)}`,
      sub: `/year per property · ₹${formatInr(perMonth)}/mo (12% off)`,
    };
  };

  return (
    <div className="space-y-6">
      <PropertyUpgradeModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSelectProperty={handlePropertySelected}
        planTier={pendingPlanTier}
        billingCycle={billingCycle}
      />

      <div>
        <p className="xpx-eyebrow">Plans</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">
          0% commission — guests pay you directly
        </h1>
        <p className="text-xpx-muted mt-2 max-w-2xl leading-relaxed">
          Optional flat plans per property (₹999 / ₹2,999). No cut on what guests pay you for the stay.
        </p>
      </div>

      <HostValueProp variant="full" showHeader={false} showUpgradeNudge={false} />

      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl p-4"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
      >
        <div>
          <p className="text-sm font-semibold text-xpx-text">Billing cycle</p>
          <p className="text-xs text-xpx-muted mt-0.5">
            Yearly saves {12}% vs paying monthly for 12 months
          </p>
        </div>
        <div
          className="inline-flex rounded-xl p-1"
          style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
          role="group"
          aria-label="Billing cycle"
        >
          {(['monthly', 'yearly'] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                billingCycle === cycle
                  ? { background: 'var(--xpx-warm)', color: '#fff' }
                  : { color: 'var(--xpx-muted)' }
              }
            >
              {cycle === 'monthly' ? 'Monthly' : 'Yearly (−12%)'}
            </button>
          ))}
        </div>
      </div>

      {(!import.meta.env.VITE_RAZORPAY_KEY_ID_HOST ||
        import.meta.env.VITE_RAZORPAY_KEY_ID_HOST === 'rzp_test_your_key_id') && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(80,200,120,0.06)', border: '1px solid rgba(80,200,120,0.30)' }}
        >
          <h3 className="font-semibold mb-1 text-xpx-text">Payment system configuration required</h3>
          <p className="text-sm text-xpx-muted">
            Set <code className="font-mono text-xpx-text">VITE_RAZORPAY_KEY_ID_HOST</code> in{' '}
            <code className="font-mono text-xpx-text">.env</code> and Razorpay secrets on Supabase Edge
            Functions (<code className="font-mono text-xpx-text">RAZORPAY_KEY_ID</code>,{' '}
            <code className="font-mono text-xpx-text">RAZORPAY_KEY_SECRET</code>).
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.30)',
            color: '#B91C1C',
          }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-2xl p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(80,200,120,0.14) 0%, var(--xpx-surface) 70%)',
          border: '1px solid rgba(80,200,120,0.30)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-6 h-6" style={{ color: 'var(--xpx-warm)' }} />
          <h3 className="text-xl font-extrabold text-xpx-text">
            Paid properties · {activePremiumCount}
          </h3>
        </div>
        <p className="text-xpx-muted">
          {activePremiumCount === 0
            ? 'Upgrade individual properties to Standard or Premium.'
            : `${activePremiumCount} ${activePremiumCount === 1 ? 'property has' : 'properties have'} an active paid plan.`}
        </p>
      </div>

      {propertySubscriptions.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--xpx-surface)',
            border: '1px solid var(--xpx-border)',
            boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          }}
        >
          <h2 className="text-xl font-bold text-xpx-text mb-4">Your property subscriptions</h2>
          <div className="space-y-3">
            {propertySubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-xl gap-3 flex-wrap sm:flex-nowrap"
                style={{
                  background: 'var(--xpx-surface-light)',
                  border: '1px solid var(--xpx-border)',
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--xpx-surface-elevated)' }}>
                    {sub.properties?.images?.[0] ? (
                      <img
                        src={sub.properties.images[0]}
                        alt={sub.properties.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-xpx-subtle" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xpx-text truncate">
                      {sub.properties?.title || 'Property'}
                    </h3>
                    <p className="text-sm text-xpx-muted truncate">
                      {sub.properties?.city}, {sub.properties?.state}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={
                      sub.subscription_status === 'active'
                        ? { background: 'rgba(80,200,120,0.10)', color: '#3dae68' }
                        : { background: 'var(--xpx-surface-elevated)', color: 'var(--xpx-muted)' }
                    }
                  >
                    {sub.subscription_status === 'active'
                      ? `${tierLabel(sub.plan_tier)} · ${sub.subscription_plan === 'yearly' ? 'Yearly' : 'Monthly'}`
                      : 'Trial'}
                  </span>
                  {sub.subscription_end_date && sub.subscription_status === 'active' && (
                    <p className="text-[11px] text-xpx-subtle mt-1">
                      Until: {new Date(sub.subscription_end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = displayPrice(plan.monthlyInr, plan.id);
          const isPaid = plan.id !== 'free';

          return (
            <div
              key={plan.id}
              className="rounded-2xl p-6 sm:p-8 relative flex flex-col"
              style={
                plan.recommended
                  ? {
                      background:
                        'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface) 70%)',
                      border: '1px solid rgba(80,200,120,0.40)',
                      boxShadow: '0 20px 56px rgba(15,23,42,0.10)',
                    }
                  : {
                      background: 'var(--xpx-surface)',
                      border: '1px solid var(--xpx-border)',
                      boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
                    }
              }
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    style={{ background: 'var(--xpx-warm)', color: '#ffffff' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Popular
                  </span>
                </div>
              )}

              {plan.id === 'premium_2999' && (
                <div className="absolute -top-3 right-4">
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--xpx-warm)' }} />
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold text-xpx-text mb-2">{plan.name}</h3>
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-xpx-text">{price.main}</span>
                  {price.sub && <span className="text-sm text-xpx-muted text-center">{price.sub}</span>}
                </div>
                <p className="text-xpx-muted text-sm">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div>
                  <p className="xpx-eyebrow mb-3">Features</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => {
                      const label = typeof feature === 'string' ? feature : feature.label;
                      const comingSoon = typeof feature === 'object' && feature.comingSoon;
                      return (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#50C878' }} />
                          <span className="text-xpx-text flex-1">
                            {label}
                            {comingSoon && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-xpx-subtle">
                                Coming soon
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div>
                    <p className="xpx-eyebrow mb-3">Not included</p>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-xpx-subtle">×</span>
                          <span className="text-xpx-subtle">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isPaid) handleSelectPlan(plan.id);
                }}
                disabled={processing || !isPaid}
                className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                style={
                  isPaid
                    ? {
                        background: 'var(--xpx-warm)',
                        color: '#ffffff',
                        boxShadow: '0 6px 20px rgba(80,200,120,0.35)',
                      }
                    : {
                        background: 'var(--xpx-surface-light)',
                        color: 'var(--xpx-text)',
                        border: '1px solid var(--xpx-border-strong)',
                      }
                }
              >
                {processing && isPaid && <Loader2 className="w-5 h-5 animate-spin" />}
                {isPaid && processing ? 'Processing…' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-4">Frequently asked questions</h2>
        <div className="space-y-4">
          <Faq
            q="Is pricing per property?"
            a="Yes. Standard is ₹999/month per property; Premium is ₹2,999/month per property. Yearly billing is 12% off the monthly × 12 total (e.g. Standard yearly ≈ ₹10,551)."
          />
          <Faq
            q="Do guests pay through Razorpay?"
            a="No. Guests pay you directly (UPI, bank transfer, or cash). Razorpay is only for your optional host subscription on this page."
          />
          <Faq
            q="How is this different from Airbnb?"
            a="Airbnb typically charges hosts around 15% per booking. XpressBnB charges ₹0 per booking — you only pay a flat monthly fee if you choose Standard or Premium tools."
          />
          <Faq
            q="What payment methods are accepted?"
            a="Cards, UPI, and net banking via Razorpay test or live keys."
          />
        </div>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-semibold text-xpx-text mb-1">{q}</h3>
      <p className="text-xpx-muted text-sm">{a}</p>
    </div>
  );
}
