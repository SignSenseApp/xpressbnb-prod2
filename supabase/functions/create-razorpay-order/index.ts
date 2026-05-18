import Razorpay from 'npm:razorpay@2.9.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface OrderRequest {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const {
      amount,
      receipt,
      currency = 'INR',
      notes = {},
    }: OrderRequest = await req.json();

    if (!amount || amount <= 0 || !receipt) {
      return new Response(
        JSON.stringify({ error: 'Amount and receipt are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Razorpay expects amount in paise (INR × 100).
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes,
    });

    return new Response(
      JSON.stringify({ success: true, order }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    let errorMessage = 'Failed to create order';
    let errorDetails: Record<string, unknown> = {};

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (error && typeof error === 'object') {
      type RazorpayErrorLike = {
        statusCode?: number;
        description?: string;
        error?: { description?: string; code?: string } | unknown;
      };
      const e = error as RazorpayErrorLike;
      errorDetails = {
        statusCode: e.statusCode,
        description: e.description,
        error: e.error,
      };
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to create order',
        message: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
