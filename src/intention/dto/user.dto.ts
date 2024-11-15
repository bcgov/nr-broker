import { Embeddable, Embedded, Property } from '@mikro-orm/core';
import { UserGroupDto } from './user-group.dto';

@Embeddable()
export class UserDto {
  /**
   * Name of the directory the user is a member of.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-domain
   */
  @Property({ nullable: true })
  domain?: string;

  /**
   * User email address.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-email
   */
  @Property({ nullable: true })
  email?: string;

  /**
   * User’s full name, if available.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-full-name
   */
  @Property({ nullable: true })
  full_name?: string;

  /**
   * User team relevant to the event.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-group.html
   */
  @Embedded({ entity: () => UserGroupDto, nullable: true })
  group?: UserGroupDto;

  /**
   * Unique identifier of the user.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-id
   */
  @Property({ nullable: true })
  id?: string;

  /**
   * Short name or login of the user.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-name
   */
  @Property({ nullable: true })
  name?: string;
}
