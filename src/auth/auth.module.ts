import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { JwtStrategy } from './jwt.strategy';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [
    AuditModule,
    ConfigModule,
    PersistenceModule,
    PassportModule,
    JwtModule.register({
      secret: 'secret',
    }),
  ],
  providers: [JwtStrategy],
})
export class AuthModule {}
