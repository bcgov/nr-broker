// Shared DTO: Copy in back-end and front-end should be identical
import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class EdgePropDto {
  /** Dummy prop as Mikro-orm doesn't like empty classes */
  @Property({ nullable: true })
  ___ignore?: string;
  [key: string]: string;
}
