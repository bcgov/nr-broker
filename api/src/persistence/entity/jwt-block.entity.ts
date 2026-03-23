import { Entity } from '@mikro-orm/decorators/legacy';
import { JwtEntity } from './jwt.entity';

@Entity({ tableName: 'jwtBlock' })
export class JwtBlockEntity extends JwtEntity {}
