import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './index.js';

describe('createLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses logs below the configured level', () => {
    const logger = createLogger({ name: 'test', level: 'warn' });

    logger.info('should be suppressed');
    logger.warn('should be shown');

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('includes bindings from child loggers', () => {
    const logger = createLogger({ name: 'test' });
    const child = logger.child({ requestId: 'abc' });

    child.info('hello');

    const call = vi.mocked(console.warn).mock.calls[0]?.[0] as string;
    expect(JSON.parse(call)).toMatchObject({ requestId: 'abc' });
  });
});
