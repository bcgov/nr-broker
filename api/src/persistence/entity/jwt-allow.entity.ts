import { Entity } from '@mikro-orm/decorators/legacy';
import { JwtEntity } from './jwt.entity';

@Entity({ tableName: 'jwtAllow' })
export class JwtAllowEntity extends JwtEntity {}
