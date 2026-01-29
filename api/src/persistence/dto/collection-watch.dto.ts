import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class CollectionWatchIdentifierDto {
  @IsString()
  @IsNotEmpty()
  channel!: string;

  @ValidateIf((o) => o.events !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  events?: string[];
}

export class CollectionWatchArrayDto {
  @ValidateNested({ each: true })
  @Type(() => CollectionWatchIdentifierDto)
  @IsArray()
  watches!: CollectionWatchIdentifierDto[];
}

export class CollectionWatchBaseDto {
  @ValidateNested()
  @IsArray()
  @IsDefined()
  @Type(() => CollectionWatchIdentifierDto)
  watches!: CollectionWatchIdentifierDto[];

  @IsString()
  @IsDefined()
  user!: string;
}

export class CollectionWatchVertexDto extends CollectionWatchBaseDto implements Omit<VertexPointerDto, 'id' | 'tags'> {
  @IsString()
  @IsDefined()
  vertex!: string;

  // Not a column - decoration based on vertex and user's roles
  @ValidateNested()
  @IsArray()
  @IsOptional()
  @Type(() => CollectionWatchIdentifierDto)
  defaultWatches?: CollectionWatchIdentifierDto[];
}

export class CollectionWatchDto extends CollectionWatchVertexDto implements Omit<VertexPointerDto, 'tags'> {
  @IsString()
  @IsDefined()
  id!: string;
}
