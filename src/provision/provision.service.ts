import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { ProvisionDto } from './provision.dto';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(private tokenService: TokenService) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param provisionDto The provision information
   * @returns A wrapped secret id
   */
  public generateSecretId(provisionDto: ProvisionDto) {
    this.logger.debug(
      `Secret id: ${provisionDto.labels.project} - ${provisionDto.service.name}`,
    );
    this.logger.debug(JSON.stringify(provisionDto));
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
  public generateToken(provisionDto: ProvisionDto, roleId: string) {
    this.logger.debug(
      `Token: ${provisionDto.labels.project} - ${provisionDto.service.name}`,
    );
    // this.logger.debug(JSON.stringify(provisionDto));
    return this.tokenService.provisionToken(
      provisionDto.labels.project,
      provisionDto.service.name,
      provisionDto.service.environment,
      roleId,
    );
  }
}
