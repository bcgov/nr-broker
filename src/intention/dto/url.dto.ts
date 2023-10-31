import { IsDefined, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class UrlDto {
  /**
   * The full url to the object
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-url.html#field-url-full
   */
  @Column()
  @IsString()
  @IsDefined()
  full?: string;
}
