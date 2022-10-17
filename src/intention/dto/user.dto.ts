import { IsString } from 'class-validator';

export class UserDto {
  /**
   * This should be the user id of the person responsible for this run.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-id
   */
  @IsString()
  id: string;
}
