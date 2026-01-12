import {
  IsArray,
  IsDefined,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical


export class CollectionWatchIdentifierDto {
  @IsString()
  @IsDefined()
  channel!: string;

  @IsArray()
  @IsDefined()
  event!: string;
}

export class CollectionWatchBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  collectionVertexId!: string;

  @ValidateNested()
  @IsDefined()
  watchIdentifier!: CollectionWatchIdentifierDto
  
  @IsString()
  @IsDefined()
  userId!: string;
}

export class CollectionWatchDto extends CollectionWatchBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
