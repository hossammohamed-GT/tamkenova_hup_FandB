import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const winstonConfig = {
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),

  transports: [
    new DailyRotateFile({
      dirname: 'logs/errors',
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
    }),

    new DailyRotateFile({
      dirname: 'logs/auth',
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxFiles: '30d',
    }),

    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
};
