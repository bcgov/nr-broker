import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { QueueWorkerModule } from './queue-worker.module';

const logger = new Logger('QueueWorker');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(QueueWorkerModule, {
    logger: ['log', 'error', 'warn'],
  });

  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) {
      return;
    }
    closing = true;
    logger.log(`Received ${signal}, stopping queue worker...`);
    try {
      await app.close();
    } catch (error) {
      logger.error(`Error closing worker: ${(error as Error).message}`);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: ' + describeError(reason));
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception: ' + describeError(error));
  process.exit(1);
});

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  }
  if (error === undefined) {
    return 'undefined';
  }
  return JSON.stringify(error, null, 2);
}

bootstrap().catch((error) => {
  logger.error('Failed to start queue worker: ' + describeError(error));
  process.exit(1);
});
