export interface RetryPolicyOptions {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs?: number;
}

export interface RetryDecision {
  readonly shouldRetry: boolean;
  readonly delayMs: number;
}

export class RetryPolicy {
  constructor(private readonly options: RetryPolicyOptions) {}

  decide(attempt: number): RetryDecision {
    if (attempt >= this.options.maxAttempts) {
      return { shouldRetry: false, delayMs: 0 };
    }

    const maxDelayMs = this.options.maxDelayMs ?? 5 * 60_000;
    const delayMs = Math.min(
      this.options.baseDelayMs * 2 ** (attempt - 1),
      maxDelayMs,
    );

    return { shouldRetry: true, delayMs };
  }

  isExhausted(attempt: number): boolean {
    return attempt >= this.options.maxAttempts;
  }
}
