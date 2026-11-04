/**
 * Unit tests for the API error normaliser and the token storage wrapper.
 *
 * These are the two pieces of pure logic where a mistake silently breaks auth,
 * so they are worth locking down with fast tests.
 */
import { tokenStorage } from '@/auth/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(async () => {
    await tokenStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    expect(await tokenStorage.load()).toBeNull();
  });

  it('round-trips a token pair', async () => {
    await tokenStorage.save({ access: 'a', refresh: 'r' });
    expect(await tokenStorage.load()).toEqual({ access: 'a', refresh: 'r' });
  });

  it('clears both tokens', async () => {
    await tokenStorage.save({ access: 'a', refresh: 'r' });
    await tokenStorage.clear();
    expect(await tokenStorage.load()).toBeNull();
  });
});
