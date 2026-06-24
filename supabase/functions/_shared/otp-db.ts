import { OTP_SEND_WINDOW_MS, PURPOSE_BOOKING } from './otp-constants.ts';

export type OtpRequestRow = {
  id: string;
  phone: string;
  purpose: string;
  code_hash: string;
  request_ip: string | null;
  expires_at: string;
  attempts: number;
  created_at: string;
};

function restHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
}

export async function listRecentOtpRequestIds(
  supabaseUrl: string,
  serviceKey: string,
  query: string,
  limit: number,
): Promise<string[]> {
  const since = new Date(Date.now() - OTP_SEND_WINDOW_MS).toISOString();
  const url =
    `${supabaseUrl}/rest/v1/otp_requests?${query}` +
    `&created_at=gte.${encodeURIComponent(since)}` +
    `&select=id&limit=${limit}`;
  const r = await fetch(url, { headers: restHeaders(serviceKey) });
  if (!r.ok) {
    console.error('otp_requests list failed', await r.text());
    return ['__error__'];
  }
  const rows = await r.json();
  if (!Array.isArray(rows)) return ['__error__'];
  return rows.map((row: { id: string }) => row.id);
}

export async function insertOtpRequest(
  supabaseUrl: string,
  serviceKey: string,
  row: {
    phone: string;
    purpose: string;
    code_hash: string;
    request_ip: string;
    expires_at: string;
  },
): Promise<boolean> {
  const r = await fetch(`${supabaseUrl}/rest/v1/otp_requests`, {
    method: 'POST',
    headers: {
      ...restHeaders(serviceKey),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    console.error('otp_requests insert failed', await r.text());
    return false;
  }
  return true;
}

export async function fetchLatestOtpRequest(
  supabaseUrl: string,
  serviceKey: string,
  phone10: string,
): Promise<OtpRequestRow | null> {
  const q =
    `phone=eq.${encodeURIComponent(phone10)}` +
    `&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}` +
    '&order=created_at.desc&limit=1';
  const sessRes = await fetch(`${supabaseUrl}/rest/v1/otp_requests?${q}`, {
    headers: restHeaders(serviceKey),
  });
  if (!sessRes.ok) {
    console.error('otp_requests fetch failed', await sessRes.text());
    return null;
  }
  const sessions = await sessRes.json();
  if (!Array.isArray(sessions) || !sessions[0]) return null;
  return sessions[0] as OtpRequestRow;
}

export async function incrementOtpAttempts(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  attempts: number,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/otp_requests?id=eq.${sessionId}`, {
    method: 'PATCH',
    headers: {
      ...restHeaders(serviceKey),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ attempts: attempts + 1 }),
  });
}
