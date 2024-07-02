import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import { PointGeom } from './point.geom';
import { ApiProperty } from '@nestjs/swagger';
import { Type, plainToInstance } from 'class-transformer';
import {
  IsDefined,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { BrokerAccountDto } from './broker-account.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';
import { EnvironmentDto } from './environment.dto';
import { ProjectDto } from './project.dto';
import { ServerDto } from './server.dto';
import { ServiceDto } from './service.dto';
import { ServiceInstanceDto } from './service-instance.dto';
import { TeamDto } from './team.dto';
import { UserDto } from './user.dto';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VertexInsertDto, VertexPropDto } from './vertex-rest.dto';
import { IsValidProp } from '../../util/validator.util';
import { TimestampDto } from './timestamp.dto';

@Entity({ name: 'vertex' })
export class VertexDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Index()
  @Column()
  @ApiProperty({ type: () => String })
  @IsDefined()
  @IsString()
  collection: keyof CollectionDtoUnion;

  @Column(() => PointGeom)
  @IsOptional()
  @ValidateNested()
  geo?: PointGeom;

  @Column()
  @IsDefined()
  @IsString()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Column()
  @IsOptional()
  @IsValidProp()
  @IsNotEmptyObject()
  prop?: VertexPropDto;

  @IsOptional()
  @Column(() => TimestampDto)
  @Type(() => TimestampDto)
  timestamps?: TimestampDto;

  static upgradeInsertDto(value: VertexInsertDto): VertexDto {
    const vertex = new VertexDto();
    vertex.collection = value.collection;
    if (value.geo) {
      vertex.geo = value.geo;
    }
    if (value.prop) {
      vertex.prop = value.prop;
    }

    return vertex;
  }

  static upgradeDataToInstance(
    vertex: VertexInsertDto,
  ): CollectionDtoUnion[typeof vertex.collection] {
    switch (vertex.collection) {
      case 'brokerAccount':
        return plainToInstance(BrokerAccountDto, vertex.data);
      case 'environment':
        return plainToInstance(EnvironmentDto, vertex.data);
      case 'project':
        return plainToInstance(ProjectDto, vertex.data);
      case 'server':
        return plainToInstance(ServerDto, vertex.data);
      case 'serviceInstance':
        return plainToInstance(ServiceInstanceDto, vertex.data);
      case 'service':
        return plainToInstance(ServiceDto, vertex.data);
      case 'team':
        return plainToInstance(TeamDto, vertex.data);
      case 'user':
        return plainToInstance(UserDto, vertex.data);
      default:
        // If this is an error then not all collection types are above
        const _exhaustiveCheck: never = vertex.collection;
        return _exhaustiveCheck;
    }
  }
}

export class VertexCollectionDto extends VertexDto {
  @ApiProperty({ type: () => VertexPointerDto })
  data: VertexPointerDto;
}
