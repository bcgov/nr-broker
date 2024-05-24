import { Injectable } from '@nestjs/common';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { ConnectionConfigRestDto } from '../persistence/dto/connection-config-rest.dto';

@Injectable()
export class SystemService {
  constructor(private readonly systemRepository: SystemRepository) {}

  async getConnections(): Promise<ConnectionConfigRestDto[]> {
    return (await this.systemRepository.getConnectionConfigs()).sort(
      (a, b) => a.order - b.order,
    ) as unknown as ConnectionConfigRestDto[];
  }
}
