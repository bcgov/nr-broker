import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuditModule } from '../audit/audit.module';
import { JwtStrategy } from './jwt.strategy';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthController } from './auth.controller';
import { OidcStrategy, buildOpenIdClient } from './oidc.strategy';
import { SessionSerializer } from './session.serializer';
import { AuthService } from './auth.service';
import { BrokerOidcAuthGuard } from './broker-oidc-auth.guard';
import { BrokerJwtAuthGuard } from './broker-jwt-auth.guard';

const OidcStrategyFactory = {
  provide: 'OidcStrategy',
  useFactory: async (authService: AuthService) => {
    const client = await buildOpenIdClient(); // secret sauce! build the dynamic client before injecting it into the strategy for use in the constructor super call.
    const strategy = new OidcStrategy(authService, client);
    return strategy;
  },
  inject: [AuthService],
};

/**
 * The auth module enables user login using OIDC.
 */
@Module({
  imports: [
    AuditModule,
    ConfigModule,
    PersistenceModule,
    PassportModule.register({ session: true, defaultStrategy: 'oidc' }),
    JwtModule.register({
      secret: 'secret',
    }),
  ],
  providers: [
    BrokerOidcAuthGuard,
    BrokerJwtAuthGuard,
    JwtStrategy,
    SessionSerializer,
    OidcStrategyFactory,
    AuthService,
  ],
  controllers: [AuthController],
  exports: [AuthService, BrokerOidcAuthGuard, BrokerJwtAuthGuard],
})
export class AuthModule {}
