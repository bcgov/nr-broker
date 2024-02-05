import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { HttpModule } from '@nestjs/axios';

/**
 * The token module provides Vault token-related services to other modules.
 */
@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
