import { Embeddable, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Embeddable()
export class TransactionEmbeddable {
  constructor(hash: string, token: string) {
    this.hash = hash;
    this.token = token;
  }

  static create() {
    const token = uuidv4();
    const hasher = crypto.createHash('sha256');
    hasher.update(token);
    return new TransactionEmbeddable(hasher.digest('hex'), token);
  }

  @Property({ hidden: true })
  token: string;

  @Property()
  hash: string;

  @Property({ nullable: true })
  start?: string;

  @Property({ nullable: true })
  end?: string;

  @Property({ nullable: true })
  duration?: number;

  @Property({ nullable: true })
  outcome?: string;
}
