export abstract class JwtValidationRepository {
  public abstract matchesAllowed(jwt: any): Promise<boolean>;
  public abstract matchesBlocked(jwt: any): Promise<boolean>;
}
