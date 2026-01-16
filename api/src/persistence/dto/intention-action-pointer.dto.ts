import { IsString, IsOptional, IsDefined } from 'class-validator';
import { IntentionDto } from '../../intention/dto/intention.dto';
import { ActionDto } from '../../intention/dto/action.dto';
import { PackageDto } from '../../intention/dto/package.dto';

// Shared DTO: Copy in back-end and front-end should be identical

export class IntentionActionPointerDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsDefined()
  intention!: string;

  @IsOptional()
  source?: {
    intention: IntentionDto;
    action: ActionDto;
    package?: PackageDto;
  };
}
