import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class ServiceBuildSearchQuery {
  @IsString()
  @Type(() => String)
  service!: string;

  @IsString()
  @Type(() => String)
  name!: string;

  @IsString()
  @Type(() => String)
  semver!: string;
}
