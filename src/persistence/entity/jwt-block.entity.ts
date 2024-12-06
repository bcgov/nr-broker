import { Entity } from '@mikro-orm/core';
import { JwtEntity } from './jwt.entity';

@Entity({ tableName: 'jwtBlock' })
export class JwtBlockEntity extends JwtEntity {}
