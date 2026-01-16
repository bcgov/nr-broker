import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TokenService } from './token.service';
import { VaultModule } from '../vault/vault.module';

/**
 * The token module provides Vault token-related services to other modules.
 */
@Module({
  imports: [HttpModule, VaultModule],
  controllers: [],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
