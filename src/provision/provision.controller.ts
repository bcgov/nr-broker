import {
  Controller,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HEADER_VAULT_ROLE_ID } from './constants';
import { DtoValidationPipe } from './dto-validation.pipe';
import { ProvisionDto } from './provision.dto';
import { ProvisionGuard } from './provision.guard';
import { ProvisionService } from './provision.service';

@Controller('provision')
@UseGuards(ProvisionGuard)
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}

  @Post('secret-id')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'))
  provisionSecretId(@Body(new DtoValidationPipe()) provisionDto: ProvisionDto) {
    return this.provisionService.generateSecretId(provisionDto);
  }

  @Post('token')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'))
  provisionToken(
    @Body(new DtoValidationPipe()) provisionDto: ProvisionDto,
    @Req() request: Request,
  ) {
    const roleId = request.headers[HEADER_VAULT_ROLE_ID];
    return this.provisionService.generateToken(provisionDto, roleId);
  }
}
