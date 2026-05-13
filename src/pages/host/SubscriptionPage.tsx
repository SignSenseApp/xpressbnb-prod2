import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, Crown, Zap, Loader2, Building2 } from 'lucide-react';
import PropertyUpgradeModal from '../../components/PropertyUpgradeModal';
import type { RazorpayPaymentResponse } from '../../lib/razorpay';
import '../../lib/razorpay';

// Subscription rows joined with the parent property (shape mirrors the
// `*, properties:property_id(...)` select below). Keep this local — the
// embedded relation isn't expressible through generated DB types.
interface PropertySubscriptionWithProperty {
  id: string;
  subscription_status: string;
  subscription_end_date: string | null;
  properties: {
    id: string;
    title: string;
    city: string;
    state: string;
    images: string[] | null;
  } | null;
}

export default function SubscriptionPage() {
  const { host } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertySubscriptions, setPropertySubscriptions] = useState<PropertySubscriptionWithProperty[]>([]);

  useEffect(() => {
    if (host?.id) {
      loadPropertySubscriptions();
    }
  }, [host?.id]);

  const loadPropertySubscriptions = async () => {
    if (!host?.id) return;

    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      // The PostgREST-embedded `properties` relation isn't part of the
      // generated row types, so we narrow through `unknown` once here rather
      // than spreading `any` through the component.
      setPropertySubscriptions((data ?? []) as unknown as PropertySubscriptionWithProperty[]);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Listing',
      price: 0,
      description: 'Get started with basic features',
      features: [
        'List unlimited properties',
        'Basic property management',
        'Accept bookings',
        'Email notifications',
        'Basic support',
      ],
      limitations: [
        'No calendar sync',
        'No analytics',
        'No verified badge',
      ],
    },
    {
      id: 'paid',
      name: 'Paid Listing',
      price: 999,
      description: 'Unlock premium features per property',
      features: [
        'Everything in Free',
        'Calendar sync with Airbnb, Booking.com',
        'Advanced analytics & insights',
        'Verified badge on listings',
        'Priority customer support',
        'Expert listing assistance',
        'Featured placement',
        'Custom branding options',
      ],
      limitations: [],
    },
  ];

  const handleUpgrade = async () => {
    setShowPropertyModal(true);
  };

  const handlePropertySelected = async (propertyId: string) => {
    if (!host) return;

    setProcessing(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 999,
          currency: 'INR',
          receipt: `property_${propertyId}_${Date.now()}`,
          notes: {
            host_id: host.id,
            property_id: propertyId,
            subscription_type: 'monthly',
          },
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Order creation failed:', responseData);
        throw new Error(responseData.message || responseData.error || 'Failed to create order');
      }

      const { order } = responseData;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'XpressBnB',
        description: 'Property Premium Subscription',
        order_id: order.id,
        handler: async function (razorpayResponse: RazorpayPaymentResponse) {
          try {
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

            const { error: insertError } = await supabase
              .from('property_subscriptions')
              .upsert({
                property_id: propertyId,
                host_id: host.id,
                subscription_status: 'active',
                subscription_plan: 'monthly',
                amount_paid: 999,
                currency: 'INR',
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                subscription_start_date: new Date().toISOString(),
                subscription_end_date: subscriptionEndDate.toISOString(),
                auto_renew: true,
              }, {
                onConflict: 'property_id'
              });

            if (insertError) throw insertError;

            alert('Property upgraded to premium successfully!');
            await loadPropertySubscriptions();
          } catch (err) {
            console.error('Error updating subscription:', err);
            setError('Payment successful but failed to update subscription. Please contact support.');
          }
        },
        prefill: {
          name: host.name,
          email: host.email,
          contact: host.phone,
        },
        theme: {
          color: '#50C878',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function () {
        setError('Payment failed. Please try again.');
      });
    } catch (err) {
      console.error('Error creating subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const activePremiumCount = propertySubscriptions.filter(
    sub => sub.subscription_status === 'active'
  ).length;

  return (
    <div className="space-y-6">
      <PropertyUpgradeModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSelectProperty={handlePropertySelected}
      />

      <div>
        <p className="xpx-eyebrow">Plans</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Subscription</h1>
        <p className="text-xpx-muted mt-2">Manage your property subscriptions</p>
      </div>

      {import.meta.env.VITE_RAZORPAY_KEY_ID === 'rzp_test_your_key_id' && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(80,200,120,0.06)', border: '1px solid rgba(80,200,120,0.30)' }}
        >
          <h3 className="font-semibold mb-1 text-xpx-text">Payment system configuration required</h3>
          <p className="text-sm text-xpx-muted">
            Add Razorpay credentials to your env to enable live subscription payments.
            Set <code className="font-mono text-xpx-text">VITE_RAZORPAY_KEY_ID</code> in <code className="font-mono text-xpx-text">.env</code> and the secret in your Supabase Edge Function environment.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.30)', color: '#B91C1C' }}
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
            Premium properties · {activePremiumCount}
          </h3>
        </div>
        <p className="text-xpx-muted">
          {activePremiumCount === 0
            ? 'Upgrade individual properties to unlock premium features.'
            : `You have ${activePremiumCount} ${activePremiumCount === 1 ? 'property' : 'properties'} with premium access.`}
        </p>
      </div>

      {propertySubscriptions.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <h2 className="text-xl font-bold text-xpx-text mb-4">Your Property Subscriptions</h2>
          <div className="space-y-3">
            {propertySubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-xl gap-3 flex-wrap sm:flex-nowrap"
                style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--xpx-surface-elevated)' }}>
                    {sub.properties?.images?.[0] ? (
                      <img src={sub.properties.images[0]} alt={sub.properties.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-xpx-subtle" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xpx-text truncate">{sub.properties?.title || 'Property'}</h3>
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
                    {sub.subscription_status === 'active' ? 'Premium Active' : 'Trial'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl p-6 sm:p-8 relative"
            style={
              plan.id === 'paid'
                ? {
                    background:
                      'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface) 70%)',
                    border: '1px solid rgba(80,200,120,0.40)',
                    boxShadow: '0 20px 56px rgba(15,23,42,0.10)',
                  }
                : { background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }
            }
          >
            {plan.id === 'paid' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ background: 'var(--xpx-warm)', color: '#ffffff' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Recommended
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-xpx-text mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-xpx-text">₹{plan.price}</span>
                {plan.price > 0 && <span className="text-xpx-muted">/mo/property</span>}
              </div>
              <p className="text-xpx-muted">{plan.description}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <p className="xpx-eyebrow mb-3">Features</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#50C878' }} />
                      <span className="text-xpx-text">{feature}</span>
                    </li>
                  ))}
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
              onClick={() => {
                if (plan.id === 'paid') handleUpgrade();
              }}
              disabled={processing || plan.id === 'free'}
              className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                plan.id === 'paid'
                  ? { background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }
                  : { background: 'var(--xpx-surface-light)', color: 'var(--xpx-text)', border: '1px solid var(--xpx-border-strong)' }
              }
            >
              {processing && plan.id === 'paid' && <Loader2 className="w-5 h-5 animate-spin" />}
              {plan.id === 'paid'
                ? processing
                  ? 'Processing…'
                  : 'Select Property to Upgrade'
                : 'Current Plan'}
            </button>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Faq
            q="Can I cancel anytime?"
            a="Yes, cancel any time. You keep premium features until the end of the billing period."
          />
          <Faq
            q="Is the price per property?"
            a="Yes, ₹999/month per property. Upgrade individual properties as needed."
          />
          <Faq
            q="What payment methods do you accept?"
            a="All major credit/debit cards, UPI, and net banking — processed via Razorpay."
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
