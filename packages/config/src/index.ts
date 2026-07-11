import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_NAME: z.string().default('AN Communications Platform'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  // Railway (and most PaaS hosts) inject PORT, not API_PORT. Fall back to it
  // so a deploy doesn't silently listen on the wrong port with no explicit
  // API_PORT set.
  const resolvedEnv =
    env.API_PORT === undefined && env.PORT !== undefined
      ? { ...env, API_PORT: env.PORT }
      : env;

  const result = envSchema.safeParse(resolvedEnv);

  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  return result.data;
}
