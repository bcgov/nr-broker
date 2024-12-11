import { Embeddable, Embedded, Property } from '@mikro-orm/core';
import { UserGroupEmbeddable } from './user-group.embeddable';
import { UserEntity } from '../../persistence/entity/user.entity';
import { BrokerAccountEntity } from '../../persistence/entity/broker-account.entity';

@Embeddable()
export class UserEmbeddable {
  static fromUserEntity(
    userEntity: UserEntity,
    accountEntity: BrokerAccountEntity,
  ) {
    const user = new UserEmbeddable();
    user.domain = userEntity.domain;
    user.email = userEntity.email;
    user.full_name = userEntity.name;
    user.id = userEntity.guid; // This is the user's external id
    user.name = userEntity.username;

    user.group = new UserGroupEmbeddable(
      'broker',
      accountEntity._id,
      accountEntity.name,
    );

    return user;
  }

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
  @Embedded({ entity: () => UserGroupEmbeddable, nullable: true, object: true })
  group?: UserGroupEmbeddable;

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
