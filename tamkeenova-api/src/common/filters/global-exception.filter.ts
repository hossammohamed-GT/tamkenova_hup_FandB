import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { LoggerService } from '../logger/logger.service';


@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {


  // Initialize instance
  constructor(private readonly logger: LoggerService) {}




  // Handle catch
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Internal Server Error';

    this.logger.logError({
      event: 'GLOBAL_EXCEPTION',
      error: exception,
      endpoint: request.url,
      ip: request.ip,
      details: {
        method: request.method,
        body: request.body,
        params: request.params,
        query: request.query,
      },
    });

    response.status(status).json({
      success: false,
      message,
    });
  }
}
