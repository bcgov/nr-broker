import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { JwtStrategy } from './jwt.strategy';
import { BasicStrategy } from './auth-basic.strategy';

@Module({
  imports: [
    AuditModule,
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: 'secret',
    }),
  ],
  providers: [BasicStrategy, JwtStrategy],
})
export class AuthModule {}
