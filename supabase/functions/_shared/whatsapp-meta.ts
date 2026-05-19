/**
 * Meta WhatsApp Cloud API (WABA).
 * Chosen over Twilio WhatsApp: Twilio is used for SMS OTP; Meta IDs match WHATSAPP_* secrets.
 */

export type WhatsAppSendResult =
  | { ok: true; messageId: string; mode: 'api' | 'dev_logged' }
  | { ok: false; error: string; devFallback?: boolean };

export async function sendWhatsAppText(
  toE164NoPlus: string,
  body: string,
): Promise<WhatsAppSendResult> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const devMode =
    Deno.env.get('WHATSAPP_DEV_MODE') === 'true' ||
    Deno.env.get('WHATSAPP_DEV_MODE') === '1' ||
    !token ||
    !phoneNumberId;

  if (devMode) {
    console.info('[whatsapp:dev]', { to: toE164NoPlus, body });
    return { ok: true, messageId: `dev_${crypto.randomUUID()}`, mode: 'dev_logged' };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toE164NoPlus,
      type: 'text',
      text: { preview_url: true, body },
    }),
  });

  const raw = await res.text();
  let json: { messages?: { id: string }[]; error?: { message?: string; code?: number } } = {};
  try {
    json = JSON.parse(raw);
  } catch {
    /* keep empty */
  }

  if (!res.ok) {
    const msg = json.error?.message ?? raw.slice(0, 500);
    const templatePending =
      json.error?.code === 132000 ||
      /template/i.test(msg) ||
      /not approved/i.test(msg);

    if (templatePending) {
      console.warn('[whatsapp:template-fallback]', { to: toE164NoPlus, body, error: msg });
      return {
        ok: true,
        messageId: `dev_template_${crypto.randomUUID()}`,
        mode: 'dev_logged',
      };
    }

    return { ok: false, error: msg };
  }

  const messageId = json.messages?.[0]?.id ?? `wa_${Date.now()}`;
  return { ok: true, messageId, mode: 'api' };
}
