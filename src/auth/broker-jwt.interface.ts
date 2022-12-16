export interface BrokerJwtPayload {
  exp: number;
  iat: number;
  nbf: number;
  jti: string;
  sub: string;
}
