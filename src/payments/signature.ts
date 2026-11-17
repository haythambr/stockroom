import { createHmac, timingSafeEqual } from 'node:crypto';

/** Webhooks older than this are refused, so a captured request can't be replayed later. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Signs a webhook body the way the payment provider does:
 * header "Stockroom-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${body}`>".
 */
export function signPayload(
  body: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  return `t=${timestamp},v1=${digest}`;
}

export type SignatureCheck = { ok: true } | { ok: false; reason: string };

export function verifySignature(
  body: string,
  header: string | undefined,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): SignatureCheck {
  if (!header) {
    return { ok: false, reason: 'Missing Stockroom-Signature header.' };
  }

  const parts = Object.fromEntries(
    header.split(',').map((p) => p.trim().split('=', 2) as [string, string]),
  );
  const timestamp = Number(parts.t);

  if (!Number.isInteger(timestamp) || !parts.v1) {
    return { ok: false, reason: 'Malformed signature header.' };
  }

  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'Signature timestamp is too old.' };
  }

  const expected = Buffer.from(
    signPayload(body, secret, timestamp).split('v1=')[1],
    'hex',
  );
  const given = Buffer.from(parts.v1, 'hex');

  // Constant-time comparison, so the signature can't be guessed byte by byte from response times.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'Signature does not match.' };
  }

  return { ok: true };
}
