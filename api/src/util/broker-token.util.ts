import { Injectable } from '@nestjs/common';

@Injectable()
export class BrokerTokenUtil {
  public getVaultKey(clientId: string): string {
    return `broker-jwt:${clientId}`;
  }
}
