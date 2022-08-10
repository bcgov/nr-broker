import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { TokenService } from '../token/token.service';

@Injectable()
export class HealthService {
  constructor(private token: TokenService) {}
  check() {
    if (!this.token.hasValidToken()) {
      throw new ServiceUnavailableException();
    }
    return true;
  }
}
