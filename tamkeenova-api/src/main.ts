import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
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
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

  app.use(
    helmet({
      contentSecurityPolicy: false,
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
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter(app.get(LoggerService)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
