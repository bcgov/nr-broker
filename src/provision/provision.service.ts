import { Injectable, Logger } from '@nestjs/common';
import { IntentionDto } from '../intention/dto/intention.dto';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private auditService: AuditService,
    private tokenService: TokenService,
  ) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param provisionDto The provision information
   * @returns A wrapped secret id
   */
  public generateSecretId(provisionDto: IntentionDto) {
    // TOOD: audit provisioning of secret id
    return this.tokenService.provisionSecretId(
      provisionDto.labels.project,
      provisionDto.service.name,
      provisionDto.service.environment,
    );
  }

  /**
   * A temporary token for configuration purposes.
   * @param provisionDto The provision information
   * @param roleId The role id
   * @returns A wrapped token
   */
  public generateToken(provisionDto: IntentionDto, roleId: string) {
    // TOOD: audit provisioning of token
    return this.tokenService.provisionToken(
      provisionDto.labels.project,
      provisionDto.service.name,
      provisionDto.service.environment,
      roleId,
    );
  }
}
