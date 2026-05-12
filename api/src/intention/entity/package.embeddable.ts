import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { Embeddable, Enum, Property } from '@mikro-orm/decorators/legacy';
import { PackageDto } from '../dto/package.dto';

export enum PACKAGE_CATEGORY_NAMES {
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  LIBRARY = 'library',
  SOFTWARE = 'software',
  UNKNOWN = 'unknown',
}

@Embeddable()
export class PackageEmbeddable {
  static merge(...theArgs: Array<PackageDto | PackageEmbeddable>) {
    const rval = new PackageEmbeddable();
    for (const arg of theArgs.filter((arg) => arg)) {
      rval.architecture = arg.architecture ?? rval.architecture;
      rval.buildGuid = arg.buildGuid ?? rval.buildGuid;
      rval.buildNumber = arg.buildNumber ?? rval.buildNumber;
      rval.buildVersion = arg.buildVersion ?? rval.buildVersion;
      rval.category = arg.category ?? rval.category;
      rval.checksum = arg.checksum ?? rval.checksum;
      rval.description = arg.description ?? rval.description;
      rval.installScope = arg.installScope ?? rval.installScope;
      rval.license = arg.license ?? rval.license;
      rval.name = arg.name ?? rval.name;
      rval.path = arg.path ?? rval.path;
      rval.reference = arg.reference ?? rval.reference;
      rval.size = arg.size ?? rval.size;
      rval.source = arg.source ?? rval.source;
      rval.tag = arg.tag ?? rval.tag;
      rval.type = arg.type ?? rval.type;
      rval.version = arg.version ?? rval.version;
    }

    // Extract tag from source for docker/oci types if tag is not set
    if (!rval.tag && rval.source && (rval.type === 'oci-container' || rval.type === 'oci-archive')) {
      const lastSegment = rval.source.split('/').pop();
      if (lastSegment?.includes(':')) {
        rval.tag = lastSegment.split(':').pop() ?? rval.tag;
      }
    }

    return rval;
  }

  static fromDto(dto: PackageDto) {
    return PackageEmbeddable.merge(dto);
  }

  @Property({ nullable: true })
  @ApiProperty({ type: () => String })
  id?: ObjectId;

  @Property({ nullable: true })
  architecture?: string;

  @Property({ nullable: true })
  buildGuid?: string;

  @Property({ nullable: true })
  buildNumber?: number;

  @Property({ nullable: true })
  buildVersion?: string;

  @Enum({ items: () => PACKAGE_CATEGORY_NAMES, nullable: true })
  category?: PACKAGE_CATEGORY_NAMES;

  @Property({ nullable: true })
  checksum?: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true })
  installScope?: string;

  @Property({ nullable: true })
  license?: string;

  @Property({ nullable: true })
  name?: string;

  @Property({ nullable: true })
  path?: string;

  @Property({ nullable: true })
  reference?: string;

  @Property({ nullable: true })
  size?: number;

  @Property({ nullable: true })
  source?: string;

  @Property({ nullable: true })
  tag?: string;

  @Property({ nullable: true })
  type?: string;

  @Property({ nullable: true })
  version?: string;
}
