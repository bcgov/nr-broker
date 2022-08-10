import { Controller, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DtoValidationPipe } from './dto-validation.pipe';
import { ProvisionDto } from './provision.dto';
import { ProvisionGuard } from './provision.guard';
import { ProvisionService } from './provision.service';

@Controller('provision')
@UseGuards(ProvisionGuard)
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}
  @Post()
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'))
  provisionApp(@Body(new DtoValidationPipe()) provisionDto: ProvisionDto) {
    return this.provisionService.provision(provisionDto);
  }
}
