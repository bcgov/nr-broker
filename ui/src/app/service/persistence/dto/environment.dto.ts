import { IsArray, IsDefined, IsNumber, IsString } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';
import { Type } from 'class-transformer';

// Shared DTO: Copy in back-end and front-end should be identical

export class EnvironmentBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  short!: string;

  @IsArray()
  @IsDefined()
  @Type(() => String)
  aliases!: string[];

  @IsArray()
  @IsDefined()
  @Type(() => String)
  changeRoles!: string[];

  @IsString()
  @IsDefined()
  title!: string;

  @IsNumber()
  @IsDefined()
  position!: number;
}

export class EnvironmentDto
  extends EnvironmentBaseDto
  implements VertexPointerDto
{
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
