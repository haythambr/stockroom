import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, get, refreshTokens, setSignedOutHandler, storedRefreshToken, storeTokens } from './client';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    storeTokens({ accessToken: 'old-access', refreshToken: 'refresh-1', expiresIn: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    storeTokens(null);
  });

  it('sends the access token and returns JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await expect(get('/cart')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer old-access');
  });

  it('refreshes an expired access token once and retries the request', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'expired' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'new-access', refreshToken: 'refresh-2', expiresIn: 900 }))
      .mockResolvedValueOnce(json(200, { items: [] }));

    await expect(get('/cart')).resolves.toEqual({ items: [] });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
    expect(storedRefreshToken()).toBe('refresh-2');
  });

  it('shares one refresh between requests that fail at the same time (refresh tokens work once)', async () => {
    let resolveRefresh!: (r: Response) => void;
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/refresh') ? new Promise<Response>((r) => (resolveRefresh = r)) : Promise.resolve(json(200, {})),
    );

    const a = refreshTokens();
    const b = refreshTokens();
    resolveRefresh(json(200, { accessToken: 'x', refreshToken: 'refresh-2', expiresIn: 900 }));

    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('signs the user out when the refresh token is rejected', async () => {
    const signedOut = vi.fn();
    setSignedOutHandler(signedOut);
    fetchMock.mockResolvedValueOnce(json(401, { message: 'expired' })).mockResolvedValueOnce(json(401, { message: 'reused' })).mockResolvedValue(json(401, {}));

    await expect(get('/cart')).rejects.toBeInstanceOf(ApiError);
    expect(signedOut).toHaveBeenCalled();
    expect(storedRefreshToken()).toBeNull();
  });

  it('turns API errors into readable messages', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { statusCode: 409, message: 'Only 0 of Leather desk tray left.', available: 0 }));

    const error = (await get('/orders').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Only 0 of Leather desk tray left.');
  });
});
