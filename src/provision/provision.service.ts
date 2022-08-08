import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from 'src/token/token.service';
import { ProvisionDto } from './provision.dto';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(private tokenService: TokenService) {}

  public provision(provisionDto: ProvisionDto) {
    this.logger.debug(
      `Provision: ${provisionDto.labels.project} - ${provisionDto.service.name}`,
    );
    this.logger.debug(provisionDto);
    return this.tokenService.provisionSecretId(
      provisionDto.labels.project,
      provisionDto.service.name,
      provisionDto.service.environment,
    );
  }
}
