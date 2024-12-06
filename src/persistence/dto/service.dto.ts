import { PackageBuildSearchResult } from './package-build.dto';
import { ServiceInstanceDetailsResponseDto } from './service-instance.dto';
import { VaultConfigDto } from './vault-config.dto';
import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServiceDto extends VertexPointerDto {
  id!: string;
  description?: string;
  name!: string;
  title?: string;
  scmUrl?: string;
  vaultConfig?: VaultConfigDto;
}

export class ServiceDetailsResponseDto extends ServiceDto {
  serviceInstance: ServiceInstanceDetailsResponseDto[];
  builds: PackageBuildSearchResult;
}
