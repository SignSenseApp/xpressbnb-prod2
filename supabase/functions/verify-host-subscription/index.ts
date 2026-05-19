import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createHmac } from 'node:crypto';
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  isHostBillingCycle,
  isHostPlanTier,
  subscriptionAmountInr,
  subscriptionEndDate,
  type HostBillingCycle,
  type HostPlanTier,
} from '../_shared/host-subscription.ts';

interface VerifyBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  property_id?: string;
  plan_tier?: string;
  billing_cycle?: string;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      property_id,
      plan_tier: planTierRaw,
      billing_cycle: billingCycleRaw,
    }: VerifyBody = await req.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !property_id ||
      !planTierRaw ||
      !billingCycleRaw
    ) {
      return new Response(JSON.stringify({ error: 'Missing required payment fields' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!isHostPlanTier(planTierRaw) || !isHostBillingCycle(billingCycleRaw)) {
      return new Response(JSON.stringify({ error: 'Invalid plan_tier or billing_cycle' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const planTier = planTierRaw as HostPlanTier;
    const billingCycle = billingCycleRaw as HostBillingCycle;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ success: false, message: 'Payment verification failed' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { data: host, error: hostError } = await supabaseUser
      .from('hosts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (hostError || !host) {
      return new Response(JSON.stringify({ error: 'Host profile not found' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: property, error: propertyError } = await supabaseUser
      .from('properties')
      .select('id, host_id')
      .eq('id', property_id)
      .maybeSingle();

    if (propertyError || !property || property.host_id !== host.id) {
      return new Response(JSON.stringify({ error: 'Property not found or access denied' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const end = subscriptionEndDate(billingCycle, now);
    const amountPaid = subscriptionAmountInr(planTier, billingCycle);

    const { error: subError } = await supabaseAdmin
      .from('property_subscriptions')
      .upsert(
        {
          property_id,
          host_id: host.id,
          subscription_status: 'active',
          subscription_plan: billingCycle,
          plan_tier: planTier,
          yearly_discount_percent: 12,
          amount_paid: amountPaid,
          currency: 'INR',
          razorpay_order_id,
          razorpay_payment_id,
          subscription_start_date: now.toISOString(),
          subscription_end_date: end.toISOString(),
          auto_renew: true,
        },
        { onConflict: 'property_id' },
      );

    if (subError) {
      throw subError;
    }

    const { error: hostUpdateError } = await supabaseAdmin
      .from('hosts')
      .update({
        subscription_status: 'active',
        plan_tier: planTier,
        billing_cycle: billingCycle,
        razorpay_order_id,
        razorpay_payment_id,
        subscription_start_date: now.toISOString(),
        subscription_next_billing: end.toISOString(),
      })
      .eq('id', host.id);

    if (hostUpdateError) {
      throw hostUpdateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription activated',
        subscription_end_date: end.toISOString(),
        plan_tier: planTier,
        billing_cycle: billingCycle,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('verify-host-subscription:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Failed to verify subscription', message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
