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

export interface BrokerServiceInstanceRestDto {
  id: string;
  name: string;
  pkgInstallHistory: PackageInstallationHistoryRestDto[];
}
