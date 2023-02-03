import { IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class UserDto {
  /**
   * This should be the user id of the person responsible for this run.
   * See: https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-id
   */
  @Column()
  @IsString()
  id: string;
}
