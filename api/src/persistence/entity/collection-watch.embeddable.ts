import {
  Embeddable,
  Property,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

@Embeddable()
export class CollectionWatchConfigDto {

  @Property()
  channel: string;

  @Property()
  events: string[];
}

@Embeddable()
export class CollectionWatchDto {

  @Property()
  userId: string;

  @Property()
  watches: CollectionWatchConfigDto[]
}
