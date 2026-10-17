import type { RequestHandler } from 'express';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';

const SECRET_KEYS = new Set([
  'password',
  'password_hash',
  'otp_code',
  'token_version',
  'failed_login_attempts',
  'locked_until',
]);

export function withoutSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSecrets);
  if (
    value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEYS.has(key))
        .map(([key, child]) => [key, withoutSecrets(child)]),
    );
  }
  return value;
}

@Injectable()
export class ResponseSecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse();
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return next.handle().pipe(map(withoutSecrets));
  }
}

export const apiSecurityHeaders: RequestHandler = (
  _request,
  response,
  next,
) => {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
};
