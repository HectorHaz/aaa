import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword, signAccessToken, verifyAccessToken } from './auth.js';

describe('auth utils', () => {
  it('hashes and compares passwords', async () => {
    const hash = await hashPassword('Secreto123!');
    expect(await comparePassword('Secreto123!', hash)).toBe(true);
  });

  it('signs and verifies access token', () => {
    const token = signAccessToken({ userId: 'u1', tenantId: 't1', roles: ['Admin'] });
    const decoded = verifyAccessToken(token) as { userId: string };
    expect(decoded.userId).toBe('u1');
  });
});
