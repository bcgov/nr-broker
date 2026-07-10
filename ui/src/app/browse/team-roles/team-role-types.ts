import { GitHubEdgeToRoles, CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';

export interface BrokerChipInfo {
  label: string;
  environmentChanges: string[];
  description?: string;
}

export interface ConnectionConfigChipInfo {
  label: string;
  description: string;
  connectionConfig: ConnectionConfigDto;
}

export interface BrokerChipClickEvent {
  edge: CollectionEdgeConfig;
  chipLabel: string;
}

export type GitHubRolesByEdge = Record<string, GitHubEdgeToRoles>;
export type ConnectionConfigChipsByRole = Record<string, ConnectionConfigChipInfo[]>;
export type BrokerRolesByEdge = Record<string, BrokerChipInfo | null>;
