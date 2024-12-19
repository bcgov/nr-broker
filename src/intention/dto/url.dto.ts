import { IsDefined, IsString } from 'class-validator';

export class UrlDto {
  /**
   * The full url to the object
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-url.html#field-url-full
   */
  @IsString()
  @IsDefined()
  full: string;
}
