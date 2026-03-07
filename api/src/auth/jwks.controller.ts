import { Controller, Get, NotFoundException, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { JwtKeyService } from './jwt-key.service';

@Controller({ path: '.well-known', version: VERSION_NEUTRAL })
export class JwksController {
  constructor(private readonly jwtKeyService: JwtKeyService) {}

  @Get('jwks.json')
  @ApiResponse({
    status: 200,
    description: 'JSON Web Key Set for verifying broker JWT tokens',
  })
  @ApiResponse({
    status: 404,
    description: 'No public key configured',
  })
  getJwks() {
    const jwks = this.jwtKeyService.getJwks();
    if (!jwks) {
      throw new NotFoundException('No public key configured');
    }
    return jwks;
  }
}
