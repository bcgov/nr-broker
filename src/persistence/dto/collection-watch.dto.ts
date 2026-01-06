import {
  IsString,
  IsDefined,
  IsArray,
} from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical


export class CollectionWatchBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  channel!: string;

  @IsArray()
  @IsDefined()
  events!: string[];
}

export class CollectionWatchDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
