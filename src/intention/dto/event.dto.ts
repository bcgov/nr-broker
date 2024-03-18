import { IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class EventDto {
  /**
   * This should identify the pipeline, action, etc. that uses the broker.
   * If this event is transient, this must uniquely identify the action.
   * Example: provision-fluentbit-demo
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-provider
   */
  @Column()
  @IsString()
  provider: string;

  /**
   * This should be a short text message outlining what triggered the usage of the broker.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-reason
   */
  @Column()
  @IsString()
  reason: string;

  /**
   * This should be set true for events triggered frequently as part of an automated
   * process. Transient events grouped by the same provider may be removed from the
   * database as needed.
   */
  @IsOptional()
  @Column()
  transient?: boolean;

  /**
   * This should be the url to the job run or action that started this usage.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-url
   */
  @Column()
  @IsString()
  @IsOptional()
  url: string;
}
