import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { PackageBuildRestDto } from './package-build-rest.dto';
import { ServiceInstanceDetailsResponseDto } from './service-instance-rest.dto';
import { VaultConfigRestDto } from './vault-config-rest.dto';
import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServiceRestDto extends VertexPointerRestDto {
  id!: string;
  description?: string;
  name!: string;
  title?: string;
  scmUrl?: string;
  vaultConfig?: VaultConfigRestDto;
}

export class ServiceDetailsResponseDto extends ServiceRestDto {
  serviceInstance: ServiceInstanceDetailsResponseDto[];
  builds: CollectionSearchResult<PackageBuildRestDto>;
}
