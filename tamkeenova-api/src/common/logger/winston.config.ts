import * as winston from 'winston';

export type LogCategory = 'auth' | 'errors' | 'security';

export function createLoggerConfig(
  category: LogCategory,
): winston.LoggerOptions {


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
