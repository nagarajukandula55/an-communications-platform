const VARIABLE_PATTERN = /{{\s*([\w.]+)\s*}}/g;

export interface Template {
  readonly id: string;
  readonly name: string;
  readonly body: string;
}

export class MissingTemplateVariableError extends Error {
  constructor(variable: string) {
    super(`Missing template variable: ${variable}`);
    this.name = 'MissingTemplateVariableError';
  }
}

export function extractTemplateVariables(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

export function renderTemplate(
  template: Template,
  variables: Readonly<Record<string, string>>,
): string {
  return template.body.replace(VARIABLE_PATTERN, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined) {
      throw new MissingTemplateVariableError(name);
    }
    return value;
  });
}
