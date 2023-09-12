import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { UserGroupDto } from './user-group.dto';

@Entity()
export class UserDto {
  /**
   * Name of the directory the user is a member of.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-domain
   */
  @Column()
  @IsString()
  @IsOptional()
  domain?: string;

  /**
   * User email address.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-email
   */
  @Column()
  @IsString()
  @IsOptional()
  email?: string;

  /**
   * User’s full name, if available.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-full-name
   */
  @Column()
  @IsString()
  @IsOptional()
  full_name?: string;

  /**
   * User team relevant to the event.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-group.html
   */
  @ValidateNested()
  @Column(() => UserGroupDto)
  @IsOptional()
  group?: UserGroupDto;

  /**
   * Unique identifier of the user.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-id
   */
  @Column()
  @IsString()
  @IsOptional()
  id?: string;

  /**
   * Short name or login of the user.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-name
   */
  @Column()
  @IsString()
  @IsOptional()
  name?: string;
}
