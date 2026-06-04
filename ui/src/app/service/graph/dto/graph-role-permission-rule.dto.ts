// Shared DTO: Copy in back-end and front-end should be identical

import { CollectionNames } from '../../persistence/dto/collection-dto-union.type';

export class GraphRolePermissionRuleStepDto {
  edgeName!: string;
  vertexIndex!: number;
  vertexCollection!: CollectionNames;
  permissions!: string[];
}

export class GraphRolePermissionRuleDto {
  key!: string;
  roleName!: string;
  steps!: GraphRolePermissionRuleStepDto[];
}
