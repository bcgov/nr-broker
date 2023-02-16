import { Entity } from 'typeorm';
import { JwtDto } from './jwt.dto';

@Entity({ name: 'jwtAllow' })
export class JwtAllowDto extends JwtDto {}
