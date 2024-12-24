import { IsDefined, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UserDto {
  /**
   * Name of the directory the user is a member of.
   */
  @IsString()
  @IsOptional()
  domain?: string;

  /**
   * Unique identifier of the user.
   */
  @ValidateIf((o) => o.domain === undefined && o.name === undefined)
  @IsString()
  @IsDefined()
  id?: string;

  /**
   * Short name or login of the user.
   */
  @ValidateIf((o) => o.id === undefined)
  @IsString()
  @IsDefined()
  name?: string;
}
