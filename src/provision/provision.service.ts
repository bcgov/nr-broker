import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from 'src/token/token.service';
import { ProvisionDto } from './provision.dto';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(private tokenService: TokenService) {}

  public provision(
    project: string,
    application: string,
    provisionDto: ProvisionDto,
  ) {
    this.logger.debug(`Provision: ${project} - ${application}`);
    this.logger.debug(provisionDto);
    return this.tokenService.provisionSecretId(
      project,
      application,
      provisionDto.environment,
    );
  }
}
