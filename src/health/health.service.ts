import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  get(): string {
    return 'alive';
  }
}
