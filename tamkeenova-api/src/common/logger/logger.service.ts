import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

import { AuthLogData, ErrorLogData, SecurityLogData } from './logger.types';


@Injectable()
export class LoggerService {
  private authLogger: winston.Logger;

  private errorLogger: winston.Logger;

  private securityLogger: winston.Logger;


  // Initialize instance
  constructor() {
    this.authLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'logs/auth/auth.log',
        }),
      ],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    });

    this.errorLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'logs/errors/errors.log',
        }),
      ],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    });

    this.securityLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'logs/security/security.log',
        }),
      ],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    });
  }



  // Handle log auth
  logAuth(data: AuthLogData) {
    this.authLogger.info(data);
  }



  // Handle log security
  logSecurity(data: SecurityLogData) {
    this.securityLogger.warn(data);
  }



  // Handle log error
  logError(data: ErrorLogData) {
    this.errorLogger.error({
      ...data,
      stack: data.error?.stack,
      message: data.error?.message,
    });
  }
}
