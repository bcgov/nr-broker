import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export interface PackageInstallationHistoryRestDto {
  architecture?: string;
  buildVersion?: string;
  checksum?: string;
  description?: string;
  installScope?: string;
  installed: Date;
  license?: string;
  name?: string;
  path?: string;
  reference?: string;
  size?: number;
  type?: string;
  version: string;
  userId: string;
}

export interface ServiceInstanceRestDto extends VertexPointerRestDto {
  id: string;
  name: string;
  pkgInstallHistory?: PackageInstallationHistoryRestDto[];
}
