import { IsNumber, IsString } from 'class-validator';

export class BrokerJwtDto {
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
