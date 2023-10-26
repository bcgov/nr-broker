import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import { PointGeom } from './point.geom';
import { ApiProperty } from '@nestjs/swagger';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VertexInsertDto } from './vertex-rest.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';
import { BrokerAccountDto } from './broker-account.dto';
import { plainToInstance } from 'class-transformer';
import { EnvironmentDto } from './environment.dto';
import { ProjectDto } from './project.dto';
import {
  PackageInstallationHistoryDto,
  ServiceInstanceDto,
} from './service-instance.dto';
import { ServiceDto } from './service.dto';
import { TeamDto } from './team.dto';
import { UserDto } from './user.dto';

@Entity({ name: 'vertex' })
export class VertexDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Index()
  @Column()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionDtoUnion;

  @Column(() => PointGeom)
  geo?: PointGeom;

  @Column()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Column()
  prop?: any;

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
      case 'serviceInstance':
        const obj = plainToInstance(ServiceInstanceDto, vertex.data);
        obj.pkgInstallHistory = plainToInstance(
          PackageInstallationHistoryDto,
          obj.pkgInstallHistory,
        );
        return obj;
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
