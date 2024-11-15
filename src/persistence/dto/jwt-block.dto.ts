import { Entity } from '@mikro-orm/core';
import { JwtDto } from './jwt.dto';

@Entity({ tableName: 'jwtBlock' })
export class JwtBlockEntity extends JwtDto {}
