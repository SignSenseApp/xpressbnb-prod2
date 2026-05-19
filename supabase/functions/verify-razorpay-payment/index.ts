import { corsHeadersFor } from '../_shared/cors.ts';

/**
 * @deprecated Guest booking payment verification is disabled.
 * Host subscriptions use verify-host-subscription.
 */
Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Guest Razorpay verification is disabled',
      message:
        'Booking inquiries do not require Razorpay. Hosts: use verify-host-subscription after checkout.',
    }),
    {
      status: 410,
      headers: { ...cors, 'Content-Type': 'application/json' },
    },
  );
});
