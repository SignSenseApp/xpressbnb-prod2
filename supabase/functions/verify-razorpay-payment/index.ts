import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    }: VerifyPaymentRequest = await req.json();

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', booking_id);

      if (updateError) {
        console.error('Error updating booking after failed verify:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Payment verification failed',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        razorpay_payment_id,
        razorpay_order_id,
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        payment_method: 'razorpay',
      })
      .eq('id', booking_id);

    if (updateError) {
      throw updateError;
    }

    // TODO: invoke send-booking-email edge function when it exists (not shipped yet).

    let host: { name: string; phone: string } | null = null;
    const { data: bookingRow } = await supabase
      .from('bookings')
      .select('host_id')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookingRow?.host_id) {
      const { data: hostRow } = await supabase
        .from('hosts')
        .select('name, phone')
        .eq('id', bookingRow.host_id)
        .maybeSingle();
      if (hostRow) {
        host = { name: hostRow.name, phone: hostRow.phone };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        host,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Failed to verify payment',
        message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
