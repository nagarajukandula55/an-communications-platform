import { describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

describe('loadConfig', () => {
  it('applies defaults for missing values', () => {
    const config = loadConfig({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.API_PORT).toBe(3000);
  });

  it('parses and coerces provided values', () => {
    const config = loadConfig({ NODE_ENV: 'production', API_PORT: '4000' });

    expect(config.NODE_ENV).toBe('production');
    expect(config.API_PORT).toBe(4000);
  });

  it('falls back to PORT when API_PORT is not set', () => {
    const config = loadConfig({ PORT: '8080' });
    expect(config.API_PORT).toBe(8080);
  });

  it('prefers an explicit API_PORT over PORT', () => {
    const config = loadConfig({ PORT: '8080', API_PORT: '4000' });
    expect(config.API_PORT).toBe(4000);
  });

  it('throws on invalid values', () => {
    expect(() => loadConfig({ NODE_ENV: 'bogus' })).toThrow(
      /Invalid configuration/,
    );
  });
});
