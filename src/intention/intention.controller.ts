import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';

import { HEADER_BROKER_TOKEN } from '../constants';
import { ActionUtil } from '../util/action.util';
import { IntentionEntityValidationPipe } from './intention-dto-validation.pipe';
import { IntentionService } from './intention.service';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { ActionGuardRequest } from './action-guard-request.interface';
import { ActionGuard } from './action.guard';
import { IntentionSearchQuery } from './dto/intention-search-query.dto';
import { IntentionCloseDto } from './dto/intention-close.dto';
import { ArtifactDto } from './dto/artifact.dto';
import { ArtifactSearchQuery } from './dto/artifact-search-query.dto';
import { ActionPatchRestDto } from './dto/action-patch-rest.dto';
import { IntentionDto } from './dto/intention.dto';
import {
  ACTION_END_STATUSES,
  INTENTION_CLOSE_STATUSES,
} from './dto/constants.dto';
import { ParseObjectIdPipe } from '../util/parse-objectid.pipe';

@Controller({
  path: 'intention',
  version: '1',
})
export class IntentionController {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly intentionService: IntentionService,
  ) {}

  @Post('open')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  async openIntention(
    @Req() request: Request,
    @Body(IntentionEntityValidationPipe)
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
    @Query('quickstart') quickStart: boolean | undefined,
  ) {
    const intention = await this.intentionService.open(
      request,
      intentionDto,
      ttl,
    );
    if (quickStart) {
      this.intentionService.quickStart(request, intention);
    }
    return intention;
  }

  @Post('preflight')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  preflightIntention(
    @Req() request: Request,
    @Body(IntentionEntityValidationPipe)
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
  ) {
    return this.intentionService.open(request, intentionDto, ttl, true);
  }

  @Post('close')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @ApiQuery({
    name: 'outcome',
    required: false,
    enum: INTENTION_CLOSE_STATUSES,
  })
  @ApiQuery({
    name: 'reason',
    required: false,
  })
  async closeIntention(
    @Req() request: Request,
    @Query('outcome') outcome: INTENTION_CLOSE_STATUSES | undefined,
    @Query('reason') reason: string | undefined,
  ): Promise<IntentionCloseDto> {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    if (outcome === undefined) {
      outcome = INTENTION_CLOSE_STATUSES.SUCCESS;
    }
    if (
      outcome !== 'failure' &&
      outcome !== 'success' &&
      outcome !== 'unknown'
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal outcome',
        error:
          'The outcome parameter must be undefined or be one of failure, success or unknown.',
      });
    }
    const intention = await this.intentionService.close(
      request,
      token,
      outcome,
      reason,
    );
    return {
      statusCode: 200,
      message: 'Intention closed',
      audit: this.actionUtil.auditUrlForIntention(intention),
    };
  }

  @Post('action/end')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @ApiQuery({
    name: 'outcome',
    required: false,
    enum: ACTION_END_STATUSES,
  })
  @UseGuards(ActionGuard)
  async actionEnd(
    @Req() request: ActionGuardRequest,
    @Query('outcome') outcome: ACTION_END_STATUSES | undefined,
  ) {
    if (outcome === undefined) {
      outcome = ACTION_END_STATUSES.SUCCESS;
    }
    if (
      outcome !== 'failure' &&
      outcome !== 'success' &&
      outcome !== 'unknown'
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal outcome',
        error:
          'The outcome parameter must be undefined or be one of failure, success or unknown.',
      });
    }
    await this.intentionService.actionLifecycle(
      request,
      request.brokerIntention,
      request.brokerAction,
      outcome,
      'end',
    );
  }

  @Post('action/artifact')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @UseGuards(ActionGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async actionArtifactRegister(
    @Req() request: ActionGuardRequest,
    @Body() artifact: ArtifactDto,
  ) {
    if (!['backup', 'package-build'].includes(request.brokerAction.action)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal action',
        error:
          'Artifacts can only be attached to backup or package-build actions',
      });
    }
    return await this.intentionService.actionArtifactRegister(
      request,
      request.brokerIntention,
      request.brokerAction,
      artifact,
    );
  }

  @Post('action/patch')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @UseGuards(ActionGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async actionPackageAnnotate(
    @Req() request: ActionGuardRequest,
    @Body() actionPatch: ActionPatchRestDto,
  ) {
    if (
      !['package-build', 'package-installation'].includes(
        request.brokerAction.action,
      )
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal action',
        error:
          'Only package-build or package-installation actions can be patched',
      });
    }

    try {
      return await this.intentionService.patchAction(
        request,
        request.brokerIntention,
        request.brokerAction,
        actionPatch,
      );
    } catch (e) {
      await this.intentionService.close(
        request,
        request.brokerIntention.transaction.token,
        'failure',
        'Patch failure',
      );
      throw e;
    }
  }

  @Post('artifact-search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async artifactSearch(@Query() query: ArtifactSearchQuery) {
    return await this.intentionService.artifactSearchByQuery(query);
  }

  @Post('action/start')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @UseGuards(ActionGuard)
  async actionStart(@Req() request: ActionGuardRequest) {
    await this.intentionService.actionLifecycle(
      request,
      request.brokerIntention,
      request.brokerAction,
      undefined,
      'start',
    );
  }

  @Get(':id')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getIntention(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.intentionService.getIntention(
      id,
    ) as unknown as Promise<IntentionDto>;
  }

  @Post('search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  search(@Query() query: IntentionSearchQuery) {
    return this.intentionService.search(query.where, query.offset, query.limit);
  }
}
