import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!Number.isInteger(status) || status < 100 || status > 599) status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message ?? exception.message;
      this.logger.logError({
        event: 'HTTP_EXCEPTION',
        error: exception,
        endpoint: request.url,
        ip: request.ip,
        details: { method: request.method, status },
      });
      response.status(status).json({
        success: false,
        message,
        error_code: status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'REQUEST_FAILED',
      });
      return;
    }

    const rawMessage = exception instanceof Error ? exception.message : 'Unknown error';
    const infrastructure = /P1001|database|supabase|storage|fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(rawMessage);
    const safeMessage = infrastructure
      ? 'A temporary service problem occurred. Please try again shortly.'
      : 'The request could not be completed.';

    this.logger.logError({
      event: 'GLOBAL_EXCEPTION',
      error: exception,
      endpoint: request.url,
      ip: request.ip,
      details: { method: request.method, status, infrastructure },
    });

    response.status(status).json({
      success: false,
      message: safeMessage,
      error_code: infrastructure ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED',
    });
  }
}
