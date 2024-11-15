import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class UrlDto {
  /**
   * The full url to the object
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-url.html#field-url-full
   */
  @Property()
  full?: string;
}
