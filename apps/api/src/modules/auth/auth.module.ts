import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.expiresIn',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      // Only register the Google OAuth strategy when it is actually configured.
      // passport-oauth2 throws at construction if clientID/clientSecret are missing,
      // which would otherwise break app bootstrap (and every e2e test) in
      // environments without Google credentials, such as CI.
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('google.clientId');
        const clientSecret = configService.get<string>('google.clientSecret');
        return clientId && clientSecret
          ? new GoogleStrategy(configService)
          : null;
      },
      inject: [ConfigService],
    },
  ],
})
export class AuthModule {}
