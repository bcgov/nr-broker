import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { COMMUNICATION_TASKS } from './communication.constants';
import { CommunicationTaskService } from './communication-task.service';

@Injectable()
export class CommunicationHealthIndicator {
  constructor(
    @Inject(COMMUNICATION_TASKS)
    private readonly communicationTasks: Array<CommunicationTaskService>,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    return indicator.up(
      this.communicationTasks.reduce((acc, task) => {
        acc[task.type()] = true;
        return acc;
      }, {}),
    );
  }
}
