import { Embeddable, Property } from '@mikro-orm/core';
import { BrokerJwtDto } from './broker-jwt.dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

@Embeddable()
export class BrokerJwtEmbeddable {
  constructor(
    client_id: string,
    exp: number,
    iat: number,
    nbf: number,
    jti: string,
    sub: string,
  ) {
    this.client_id = client_id;
    this.exp = exp;
    this.iat = iat;
    this.nbf = nbf;
    this.jti = jti;
    this.sub = sub;
  }

  static fromUser(user: Express.User): BrokerJwtEmbeddable {
    const userDto = plainToInstance(BrokerJwtDto, user);
    const errors = validateSync(userDto);

    if (errors.length > 0) {
      return null;
    }

    return new BrokerJwtEmbeddable(
      userDto.client_id,
      userDto.exp,
      userDto.iat,
      userDto.nbf,
      userDto.jti,
      userDto.sub,
    );
  }

  @Property()
  client_id: string;
  @Property()
  exp: number;
  @Property()
  iat: number;
  @Property()
  nbf: number;
  @Property()
  jti: string;
  @Property()
  sub: string;
}
