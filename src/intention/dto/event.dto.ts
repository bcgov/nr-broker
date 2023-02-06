import { IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class EventDto {
  /**
   * This should uniquely identify the pipeline, action, etc. that uses the broker.
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
   * This should be the url to the job run or action that started this usage.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-url
   */
  @Column()
  @IsString()
  @IsOptional()
  url: string;
}
