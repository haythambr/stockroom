import { signPayload, verifySignature } from './signature';

const secret = 'whsec_test_secret_123';
const body = JSON.stringify({ id: 'evt_1', type: 'payment.succeeded' });
const now = 1_800_000_000;

describe('webhook signatures', () => {
  it('accepts a body signed with the shared secret', () => {
    expect(
      verifySignature(body, signPayload(body, secret, now), secret, now),
    ).toEqual({ ok: true });
  });

  it('rejects a body that was changed after signing', () => {
    const header = signPayload(body, secret, now);
    expect(
      verifySignature(body.replace('evt_1', 'evt_2'), header, secret, now),
    ).toMatchObject({ ok: false });
  });

  it('rejects a signature made with another secret', () => {
    expect(
      verifySignature(
        body,
        signPayload(body, 'someone-elses-secret', now),
        secret,
        now,
      ),
    ).toMatchObject({ ok: false });
  });

  it('rejects old signatures so captured requests cannot be replayed', () => {
    const header = signPayload(body, secret, now - 301);
    expect(verifySignature(body, header, secret, now)).toEqual({
      ok: false,
      reason: 'Signature timestamp is too old.',
    });
  });

  it('rejects missing or malformed headers', () => {
    expect(verifySignature(body, undefined, secret, now)).toMatchObject({
      ok: false,
    });
    expect(verifySignature(body, 'nonsense', secret, now)).toMatchObject({
      ok: false,
    });
    expect(verifySignature(body, `t=${now},v1=abc`, secret, now)).toMatchObject(
      { ok: false },
    );
  });
});
