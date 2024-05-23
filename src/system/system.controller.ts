import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';

@Controller({
  path: 'system',
  version: '1',
})
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('preference/connection')
  @UseGuards(BrokerOidcAuthGuard)
  getConnections() {
    return this.systemService.getConnections();
  }
}
