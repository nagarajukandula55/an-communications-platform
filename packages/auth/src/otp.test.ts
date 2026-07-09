import { describe, expect, it } from 'vitest';
import { InMemoryCache } from '@acp/cache';
import { OtpAttemptsExceededError, OtpService } from './otp.js';

describe('OtpService', () => {
  it('generates a code of the configured length', async () => {
    const service = new OtpService(new InMemoryCache(), { length: 6 });
    const code = await service.request('login', 'user-1');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies a correct code and consumes it', async () => {
    const service = new OtpService(new InMemoryCache());
    const code = await service.request('login', 'user-1');

    await expect(service.verify('login', 'user-1', code)).resolves.toBe(true);
    // consumed: verifying again fails even with the right code
    await expect(service.verify('login', 'user-1', code)).resolves.toBe(false);
  });

  it('rejects an incorrect code', async () => {
    const service = new OtpService(new InMemoryCache());
    await service.request('login', 'user-1');

    await expect(service.verify('login', 'user-1', '000000')).resolves.toBe(
      false,
    );
  });

  it('scopes codes by purpose and identifier', async () => {
    const service = new OtpService(new InMemoryCache());
    const code = await service.request('login', 'user-1');

    await expect(service.verify('signup', 'user-1', code)).resolves.toBe(
      false,
    );
    await expect(service.verify('login', 'user-2', code)).resolves.toBe(
      false,
    );
  });

  it('throws OtpAttemptsExceededError after too many wrong guesses', async () => {
    const service = new OtpService(new InMemoryCache(), { maxAttempts: 3 });
    await service.request('login', 'user-1');

    await expect(service.verify('login', 'user-1', 'wrong1')).resolves.toBe(
      false,
    );
    await expect(service.verify('login', 'user-1', 'wrong2')).resolves.toBe(
      false,
    );
    await expect(
      service.verify('login', 'user-1', 'wrong3'),
    ).rejects.toBeInstanceOf(OtpAttemptsExceededError);

    // the entry is gone even with the correct code afterwards
    await expect(service.verify('login', 'user-1', 'wrong1')).resolves.toBe(
      false,
    );
  });

  it('returns false once the code has expired', async () => {
    const service = new OtpService(new InMemoryCache(), { ttlMs: 10 });
    const code = await service.request('login', 'user-1');

    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(service.verify('login', 'user-1', code)).resolves.toBe(
      false,
    );
  });
});
