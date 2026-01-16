import { IsDefined, IsString } from 'class-validator';
import { UserBaseDto } from '../../persistence/dto/user.dto';

export class UserRolesDto extends UserBaseDto {
  @IsDefined()
  @IsString()
  vertex!: string;

  @IsDefined()
  @IsString({ each: true })
  roles!: string[];

  constructor(vertex: string) {
    super();
    this.vertex = vertex;
  }
}
