import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),

          signOptions: {
            expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as any,
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, AuthRepository, JwtStrategy],

  exports: [JwtModule],
})
export class AuthModule {}
