export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LoggerOptions {
  readonly name: string;
  readonly level?: LogLevel;
}

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}

function write(
  name: string,
  level: LogLevel,
  message: string,
  bindings: LogContext,
  context: LogContext | undefined,
): void {
  const entry = {
    time: new Date().toISOString(),
    level,
    name,
    message,
    ...bindings,
    ...context,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else {
    console.warn(line);
  }
}

function createEntry(
  name: string,
  minLevel: LogLevel,
  bindings: LogContext,
): Logger {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    if (levelOrder[level] < levelOrder[minLevel]) {
      return;
    }
    write(name, level, message, bindings, context);
  };

  return {
    debug: (message, context) => {
      log('debug', message, context);
    },
    info: (message, context) => {
      log('info', message, context);
    },
    warn: (message, context) => {
      log('warn', message, context);
    },
    error: (message, context) => {
      log('error', message, context);
    },
    child: (childBindings: LogContext) =>
      createEntry(name, minLevel, { ...bindings, ...childBindings }),
  };
}

export function createLogger(options: LoggerOptions): Logger {
  return createEntry(options.name, options.level ?? 'info', {});
}
