import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Razorpay from 'npm:razorpay@2.9.2';
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  hostSubscriptionReceipt,
  isHostBillingCycle,
  isHostPlanTier,
  subscriptionAmountInr,
} from '../_shared/host-subscription.ts';

interface CreateOrderBody {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    const body: CreateOrderBody = await req.json();
    const propertyId = body.property_id?.trim();
    const planTier = body.plan_tier?.trim() ?? '';
    const billingCycle = body.billing_cycle?.trim() ?? 'monthly';

    if (!propertyId || !isHostPlanTier(planTier) || !isHostBillingCycle(billingCycle)) {
      return new Response(
        JSON.stringify({
          error: 'property_id, plan_tier (standard_999|premium_2999), and billing_cycle (monthly|yearly) are required',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { data: host, error: hostError } = await supabaseUser
      .from('hosts')
      .select('id, name, email, phone')
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
      .select('id, host_id, title')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !property || property.host_id !== host.id) {
      return new Response(JSON.stringify({ error: 'Property not found or access denied' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const amountInr = subscriptionAmountInr(planTier, billingCycle);
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: hostSubscriptionReceipt(propertyId),
      notes: {
        kind: 'host_property_subscription',
        host_id: host.id,
        property_id: propertyId,
        plan_tier: planTier,
        billing_cycle: billingCycle,
        amount_inr: String(amountInr),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        order,
        amount_inr: amountInr,
        plan_tier: planTier,
        billing_cycle: billingCycle,
        host: { name: host.name, email: host.email, phone: host.phone },
        property: { id: property.id, title: property.title },
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('create-host-subscription-order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return new Response(JSON.stringify({ error: 'Failed to create order', message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
