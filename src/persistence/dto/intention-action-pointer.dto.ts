import { Column } from 'typeorm';
import { ObjectId } from 'mongodb';
import { IsDefined, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IntentionDto } from '../../intention/dto/intention.dto';
import { ActionDto } from '../../intention/dto/action.dto';

export class IntentionActionPointerDto {
  @IsString()
  @IsDefined()
  @Column()
  action: string;

  @IsDefined()
  @Column()
  @ApiProperty({ type: () => String })
  @Type(() => ObjectId)
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
  intention: ObjectId;

  // For returning joined intention
  source?: {
    intention: IntentionDto;
    action: ActionDto;
  };
}
