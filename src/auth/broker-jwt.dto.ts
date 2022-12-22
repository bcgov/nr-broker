import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BrokerJwtDto {
  @IsNumber()
  exp: number;
  @IsNumber()
  iat: number;
  @IsNumber()
  nbf: number;
  @IsString()
  jti: string;
  @IsString()
  sub: string;
  // Temporary: Limit token usage to specific projects
  @IsOptional()
  projects?: string[];
  // Temporary: Skip normal authorization of users
  @IsOptional()
  delegatedUserAuth?: boolean;
}
