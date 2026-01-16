// Shared DTO: Copy in back-end and front-end should be identical

export type HealthCheckStatus = 'error' | 'ok' | 'shutting_down';
export type HealthIndicatorStatus = 'up' | 'down';

export class HealthCheckStatusInfo {
  status!: HealthCheckStatus;
}

export class HealthIndicatorResult {
  [key: string]: {
    /**
     * The status if the given health indicator was successful or not
     */
    status: HealthIndicatorStatus;
    /**
     * Optional settings of the health indicator result
     */
    [optionalKeys: string]: any;
  };
}

export class HealthCheckDto {
  status!: HealthCheckStatus;
  info!: HealthIndicatorResult;
  error!: HealthIndicatorResult;
  details!: HealthIndicatorResult;
}
