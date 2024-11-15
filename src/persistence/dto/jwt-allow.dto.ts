import { Entity } from '@mikro-orm/core';
import { JwtDto } from './jwt.dto';

@Entity({ tableName: 'jwtAllow' })
export class JwtAllowEntity extends JwtDto {}
