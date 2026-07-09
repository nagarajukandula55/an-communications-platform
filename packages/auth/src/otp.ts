import { randomInt } from 'node:crypto';
import type { CacheStore } from '@acp/cache';
import { hashApiKey, verifyApiKey } from './api-keys.js';

export interface OtpOptions {
  readonly length?: number;
  readonly ttlMs?: number;
  readonly maxAttempts?: number;
}

interface OtpEntry {
  readonly hashedCode: string;
  readonly attempts: number;
}

const DEFAULT_LENGTH = 6;
const DEFAULT_TTL_MS = 5 * 60_000;
const DEFAULT_MAX_ATTEMPTS = 5;

export class OtpAttemptsExceededError extends Error {
  constructor() {
    super('Too many incorrect OTP attempts');
    this.name = 'OtpAttemptsExceededError';
  }
}

function cacheKey(purpose: string, identifier: string): string {
  return `otp:${purpose}:${identifier}`;
}

function generateCode(length: number): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, '0');
}

export class OtpService {
  private readonly length: number;
  private readonly ttlMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly cache: CacheStore,
    options: OtpOptions = {},
  ) {
    this.length = options.length ?? DEFAULT_LENGTH;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  async request(purpose: string, identifier: string): Promise<string> {
    const code = generateCode(this.length);
    const entry: OtpEntry = { hashedCode: hashApiKey(code), attempts: 0 };
    await this.cache.set(cacheKey(purpose, identifier), entry, this.ttlMs);
    return code;
  }

  async verify(
    purpose: string,
    identifier: string,
    code: string,
  ): Promise<boolean> {
    const key = cacheKey(purpose, identifier);
    const entry = await this.cache.get<OtpEntry>(key);
    if (!entry) {
      return false;
    }

    if (verifyApiKey(code, entry.hashedCode)) {
      await this.cache.delete(key);
      return true;
    }

    const attempts = entry.attempts + 1;
    if (attempts >= this.maxAttempts) {
      await this.cache.delete(key);
      throw new OtpAttemptsExceededError();
    }

    await this.cache.set(key, { ...entry, attempts }, this.ttlMs);
    return false;
  }
}
