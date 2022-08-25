import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { BasicStrategy } from './auth-basic.strategy';

@Module({
  imports: [PassportModule, ConfigModule, AuditModule],
  providers: [BasicStrategy],
})
export class AuthModule {}
