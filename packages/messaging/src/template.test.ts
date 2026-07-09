import { describe, expect, it } from 'vitest';
import {
  extractTemplateVariables,
  MissingTemplateVariableError,
  renderTemplate,
} from './template.js';

describe('templates', () => {
  const template = {
    id: 't1',
    name: 'otp',
    body: 'Hi {{name}}, your code is {{code}}.',
  };

  it('extracts variable names', () => {
    expect(extractTemplateVariables(template.body)).toEqual([
      'name',
      'code',
    ]);
  });

  it('renders with all variables provided', () => {
    const result = renderTemplate(template, { name: 'Ann', code: '1234' });
    expect(result).toBe('Hi Ann, your code is 1234.');
  });

  it('throws when a variable is missing', () => {
    expect(() => renderTemplate(template, { name: 'Ann' })).toThrow(
      MissingTemplateVariableError,
    );
  });
});
