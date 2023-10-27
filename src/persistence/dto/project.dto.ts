import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'project' })
export class ProjectDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @IsOptional()
  @IsString()
  @Column()
  description?: string;

  @IsOptional()
  @IsString()
  @Column()
  email?: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @IsString()
  @Column()
  title?: string;

  @IsOptional()
  @IsString()
  @Column()
  website?: string;
}
