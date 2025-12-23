import {
  IsString,
  IsDefined,
  IsArray,
} from 'class-validator';

// Shared DTO: Copy in back-end and front-end should be identical

export class CollectionWatchDto {
  @IsString()
  @IsDefined()
  channel!: string;

  @IsArray()
  @IsDefined()
  events!: ('success' | 'failure')[];
}
