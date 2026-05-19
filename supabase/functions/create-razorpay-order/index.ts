import { corsHeadersFor } from '../_shared/cors.ts';

/**
 * @deprecated Guest booking payments are disabled. Use create-host-subscription-order
 * from the host dashboard Subscription page only.
 */
Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  return new Response(
    JSON.stringify({
      error: 'Guest Razorpay checkout is disabled',
      message:
        'Property inquiries do not use Razorpay. Hosts: upgrade via the dashboard Subscription page (create-host-subscription-order).',
    }),
    {
      status: 410,
      headers: { ...cors, 'Content-Type': 'application/json' },
    },
  );
});
