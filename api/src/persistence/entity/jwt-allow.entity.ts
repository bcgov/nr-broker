import { Entity } from '@mikro-orm/core';
import { JwtEntity } from './jwt.entity';

@Entity({ tableName: 'jwtAllow' })
export class JwtAllowEntity extends JwtEntity {}
