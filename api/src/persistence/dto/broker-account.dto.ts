// Shared DTO: Copy in back-end and front-end should be identical

import { IsString, IsDefined, IsBoolean, IsOptional } from 'class-validator';
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
  enableUserImport!: boolean;

  /** Allows this account's tokens to call the onboarding API (POST /v1/onboarding). */
  @IsBoolean()
  @IsOptional()
  enableOnboarding?: boolean;

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
  skipInstallBuildValidation!: boolean;

  @IsBoolean()
  @IsDefined()
  skipUserValidation!: boolean;

  @IsBoolean()
  @IsDefined()
  maskSemverFailures!: boolean;
}

export class BrokerAccountDto
  extends BrokerAccountBaseDto
  implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
