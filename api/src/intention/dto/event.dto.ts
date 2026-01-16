import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EventTriggerDto } from './event-trigger.dto';

export class EventDto {
  /**
   * This should identify the pipeline, action, etc. that uses the broker.
   * If this event is transient, this must uniquely identify the action.
   * Example: provision-fluentbit-demo
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-provider
   */
  @IsString()
  provider!: string;

  /**
   * This should be a short text message outlining what triggered the usage of the broker.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-reason
   */
  @IsString()
  reason!: string;

  /**
   * This should be set true for events triggered frequently as part of an automated
   * process. Transient events grouped by the same provider may be removed from the
   * database as needed.
   */
  @IsOptional()
  transient?: boolean;

  /**
   * This should be set if the event was triggered by another system. By setting this, the
   * event can be linked to the originating system. For example, many CI/CD systems can
   * trigger a job using a webhook, and this can be used to identify what called the webhook.
   * The triggering system may also want to query using this information to track the event progress.
   */
  @ValidateNested()
  @IsOptional()
  @Type(() => EventTriggerDto)
  trigger?: EventTriggerDto;

  /**
   * This should be the url to the job run or action that started this usage.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-url
   */
  @IsString()
  @IsOptional()
  url?: string;
}
