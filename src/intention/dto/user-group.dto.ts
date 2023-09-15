import { IsOptional, IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

@Entity()
export class UserGroupDto {
  @IsString()
  @IsOptional()
  @Column()
  domain: string;

  @IsString()
  @IsOptional()
  @Column()
  id: string;

  @IsString()
  @IsOptional()
  @Column()
  name: string;
}
