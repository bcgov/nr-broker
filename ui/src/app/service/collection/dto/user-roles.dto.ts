import { UserImportDto } from './user-import.dto';

export class UserRolesDto extends UserImportDto {
  alias?: any;
  roles!: string[];

  constructor(public readonly vertex: string) {
    super();
  }

  toUserImportDto(): UserImportDto {
    const dto: UserImportDto = {
      domain: this.domain,
      email: this.email,
      guid: this.guid,
      name: this.name,
      username: this.username,
    };
    return dto;
  }
}
