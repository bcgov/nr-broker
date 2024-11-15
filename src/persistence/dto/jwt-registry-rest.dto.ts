// Shared DTO: Copy in back-end and front-end should be identical

export interface TokenCreateDto {
  token: string;
}

export interface JwtRegistryClaimsDto {
  client_id: string;
  exp: number;
  jti: string;
  sub: string;
}

export interface JwtRegistryEntity {
  id: string;
  accountId: string;
  blocked?: boolean;
  claims: JwtRegistryClaimsDto;
  createdUserId: string;
  createdAt: string;
}
