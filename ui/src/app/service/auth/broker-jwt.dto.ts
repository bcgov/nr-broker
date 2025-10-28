import { IsNumber, IsString } from 'class-validator';

export class BrokerJwtDto {
  @IsString()
  client_id!: string;
  @IsNumber()
  exp!: number;
  @IsNumber()
  iat!: number;
  @IsNumber()
  nbf!: number;
  @IsString()
  jti!: string;
  @IsString()
  sub!: string;
}
