import { Column } from 'typeorm';
import { IsDefined, IsString } from 'class-validator';

export class IntentionActionPointerDto {
  @IsString()
  @IsDefined()
  @Column()
  action: string;

  // Would prefer this be an ObjectId but there is a bug with embedded docs that increments the ObjectId
  @IsString()
  @IsDefined()
  @Column()
  intention: string;
}
