import { Controller, Post, Body, Param } from '@nestjs/common';
import { ProvisionDto } from './provision.dto';
import { ProvisionService } from './provision.service';

@Controller('provision')
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}
  @Post(':project/:application')
  provisionApp(
    @Param('project') project: string,
    @Param('application') application: string,
    @Body() provisionDto: ProvisionDto,
  ) {
    return this.provisionService.provision(project, application, provisionDto);
  }
}
