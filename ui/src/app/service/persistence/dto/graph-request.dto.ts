import { Type } from 'class-transformer';
import { IsString, IsDefined, IsDate } from 'class-validator';
import { VertexDto } from './vertex.dto';
import { EdgeDto } from './edge.dto';

export class GraphRequestDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsDate()
  @IsDefined()
  @Type(() => Date)
  created!: Date;

  @IsString()
  @IsDefined()
  type!: 'edge' | 'vertex';

  @IsDefined()
  data!: Omit<EdgeDto, 'id'> | Omit<VertexDto, 'id'>;

  @IsString()
  @IsDefined()
  requestor!: string;
}
