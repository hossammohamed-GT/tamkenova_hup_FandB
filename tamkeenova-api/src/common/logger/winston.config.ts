import * as winston from 'winston';

export type LogCategory = 'auth' | 'errors' | 'security';

export function createLoggerConfig(
  category: LogCategory,
): winston.LoggerOptions {
  // Vercel Functions have a read-only application filesystem. Use stdout/stderr
  // so logs are available in Vercel Logs without creating files at startup.
  const transport =
    process.env.VERCEL === '1'
      ? new winston.transports.Console({ stderrLevels: ['error'] })
      : new winston.transports.File({
          filename: `logs/${category}/${category}.log`,
        });

  return {
    defaultMeta: { category },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [transport],
  };
}
