import { supabase } from './supabase';
import { loadRazorpayCheckout, type RazorpayPaymentResponse } from './razorpay';
import type { HostBillingCycle, HostPlanTier } from './hostSubscriptionPricing';
import { subscriptionAmountInr } from './hostSubscriptionPricing';

export interface HostCheckoutParams {
  propertyId: string;
  planTier: HostPlanTier;
  billingCycle: HostBillingCycle;
  host: { id: string; name: string; email: string; phone: string };
  onError: (message: string) => void;
  onSuccess: () => void | Promise<void>;
}

export async function startHostSubscriptionCheckout({
  propertyId,
  planTier,
  billingCycle,
  host,
  onError,
  onSuccess,
}: HostCheckoutParams): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    onError('Please sign in again to continue checkout.');
    return;
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const createUrl = `${baseUrl}/functions/v1/create-host-subscription-order`;
  const verifyUrl = `${baseUrl}/functions/v1/verify-host-subscription`;

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      property_id: propertyId,
      plan_tier: planTier,
      billing_cycle: billingCycle,
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    throw new Error(createData.message || createData.error || 'Failed to create order');
  }

  const { order } = createData as { order: { id: string; amount: number; currency: string } };
  const amountInr = subscriptionAmountInr(planTier, billingCycle);
  const planLabel = planTier === 'premium_2999' ? 'Premium' : 'Standard';

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID_HOST,
    amount: order.amount,
    currency: order.currency,
    name: 'XpressBnB',
    description: `${planLabel} · ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} (per property)`,
    order_id: order.id,
    handler: async function (razorpayResponse: RazorpayPaymentResponse) {
      if (!razorpayResponse.razorpay_signature) {
        onError('Payment succeeded but signature missing. Contact support with your payment ID.');
        return;
      }

      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          property_id: propertyId,
          plan_tier: planTier,
          billing_cycle: billingCycle,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        onError(
          verifyData.message ||
            'Payment received but activation failed. Contact support with your payment ID.',
        );
        return;
      }

      await onSuccess();
    },
    prefill: {
      name: host.name,
      email: host.email,
      contact: host.phone,
    },
    notes: {
      property_id: propertyId,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      amount_inr: String(amountInr),
    },
    theme: { color: '#50C878' },
  };

  try {
    await loadRazorpayCheckout();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Could not load payment SDK');
    return;
  }

  if (!window.Razorpay) {
    onError('Payment SDK unavailable. Please retry in a moment.');
    return;
  }

  const razorpay = new window.Razorpay(options);
  razorpay.on('payment.failed', () => {
    onError('Payment failed. Please try again.');
  });
  razorpay.open();
}
