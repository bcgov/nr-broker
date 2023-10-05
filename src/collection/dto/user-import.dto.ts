import { IsString } from 'class-validator';

export class UserImportDto {
  @IsString()
  domain!: string;
  @IsString()
  email!: string;
  @IsString()
  guid!: string;
  @IsString()
  name!: string;
  @IsString()
  username!: string;
}
