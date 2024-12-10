import { IsString, IsOptional, IsDefined } from 'class-validator';

// Shared DTO: Copy in back-end and front-end should be identical

export class IntentionActionPointerDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsDefined()
  intention: string;
  source?: any;
}
