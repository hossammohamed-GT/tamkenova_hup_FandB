import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as winston from 'winston';

import { AuthLogData, ErrorLogData, SecurityLogData } from './logger.types';
import { createLoggerConfig } from './winston.config';

@Injectable()
export class LoggerService implements OnModuleDestroy {
  private readonly authLogger: winston.Logger;
  private readonly errorLogger: winston.Logger;
  private readonly securityLogger: winston.Logger;

  constructor() {
    this.authLogger = winston.createLogger(createLoggerConfig('auth'));
    this.errorLogger = winston.createLogger(createLoggerConfig('errors'));
    this.securityLogger = winston.createLogger(createLoggerConfig('security'));
  }

  logAuth(data: AuthLogData) {
    this.authLogger.info(data);
  }

  logSecurity(data: SecurityLogData) {
    this.securityLogger.warn(data);
  }

  logError(data: ErrorLogData) {
    this.errorLogger.error({
      ...data,
      stack: data.error?.stack,
      message: data.error?.message,
    });
  }

  onModuleDestroy() {
    this.authLogger.close();
    this.errorLogger.close();
    this.securityLogger.close();
  }
}
