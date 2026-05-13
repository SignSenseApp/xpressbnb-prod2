import Razorpay from 'npm:razorpay@2.9.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OrderRequest {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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

    // `currency` and `notes` are accepted by the client (see OrderRequest) but
    // are currently ignored — the order body below pins INR and a hard-coded
    // receipt. Destructured with leading underscores to mark them as
    // intentionally unused.
    const { amount, receipt, currency: _currency = 'INR', notes: _notes = {} }: OrderRequest = await req.json();
    void _currency;
    void _notes;

    if (!amount || !receipt) {
      return new Response(
        JSON.stringify({ error: 'Amount and receipt are required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

   const FIXED_PRICE = 999;

const order = await razorpay.orders.create({
  amount: FIXED_PRICE * 100,
  currency: "INR",
  receipt: "order_xpressbnb_001",
});

    return new Response(
      JSON.stringify({
        success: true,
        order,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'Failed to create order';
    let errorDetails = {};

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (error && typeof error === 'object') {
      // Razorpay error objects ship as `{ statusCode, error: { description, ... } }`.
      // We narrow with an inline structural type rather than `any` so each
      // access is type-checked.
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});