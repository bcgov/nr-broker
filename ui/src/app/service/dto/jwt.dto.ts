import { IsOptional, IsString } from 'class-validator';

export abstract class JwtDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  expiry?: string;

  @IsString()
  @IsOptional()
  jti?: string;

  @IsString()
  @IsOptional()
  sub?: string;
}
