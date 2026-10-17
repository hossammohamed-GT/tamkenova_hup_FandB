import {
  ResponseSecurityInterceptor,
  apiSecurityHeaders,
} from './common/security/response-security.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { applicationValidationPipe } from './common/validation/field-validation';
import { ForbiddenException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggerService } from './common/logger/logger.service';
import { isAllowedOrigin } from './common/security/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.disable('x-powered-by');
  app.use(apiSecurityHeaders);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 15552000, includeSubDomains: true },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new ForbiddenException('Origin not allowed'));
    },
    credentials: false,
  });

  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });
  app.useGlobalInterceptors(new ResponseSecurityInterceptor());
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter(app.get(LoggerService)));

  app.useGlobalPipes(applicationValidationPipe());

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}

bootstrap();
