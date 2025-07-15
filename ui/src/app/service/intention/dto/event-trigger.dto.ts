import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EventTriggerDto {
  /**
   * This should uniquely identify the event trigger. While not required,
   * it is recommended that the trigger use or create a UUID for this field.
   */
  @IsString()
  id!: string;

  /**
   * An optional name for the event trigger. This can be used to provide
   * a human-readable name for the trigger, such as the name of the source system
   * or the specific event that triggered the action.
   * For example, "GitHub Action" or "Jenkins Job".
   */
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(25)
  name?: string;

  /**
   * An optional URL that can be used to link back to the event in the triggering system.
   */
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;
}
