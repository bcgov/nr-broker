import {
  IsString,
  IsDefined,
  IsArray,
  ValidateNested,
} from 'class-validator';

// Shared DTO: Copy in back-end and front-end should be identical


export class CollectionWatchConfigDto {
  @IsString()
  @IsDefined()
  channel!: string;

  @IsArray()
  @IsDefined()
  events!: string[];
}

export class CollectionWatchDto {
  @IsString()
  @IsDefined()
  userId!: string;

  @ValidateNested()
  @IsArray()
  @IsDefined()
  watches!: CollectionWatchConfigDto[]
}
