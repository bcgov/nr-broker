import { Entity } from 'typeorm';
import { JwtDto } from './jwt.dto';

@Entity({ name: 'jwtBlock' })
export class JwtBlockDto extends JwtDto {}
