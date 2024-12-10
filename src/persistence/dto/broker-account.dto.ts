// Shared DTO: Copy in back-end and front-end should be identical

import { IsString, IsDefined, IsBoolean } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

export class BrokerAccountBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  email!: string;

  @IsString()
  @IsDefined()
  clientId!: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsBoolean()
  @IsDefined()
  requireRoleId!: boolean;

  @IsBoolean()
  @IsDefined()
  requireProjectExists!: boolean;

  @IsBoolean()
  @IsDefined()
  requireServiceExists!: boolean;

  @IsBoolean()
  @IsDefined()
  skipUserValidation!: boolean;

  @IsBoolean()
  @IsDefined()
  maskSemverFailures!: boolean;
}

export class BrokerAccountDto
  extends BrokerAccountBaseDto
  implements VertexPointerDto
{
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
