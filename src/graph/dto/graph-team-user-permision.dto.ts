import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class GraphTeamUserPermissionDto {
  @IsString()
  @Type(() => String)
  teamVertexId!: string;

  @IsString()
  @Type(() => String)
  roleName!: string;
}
