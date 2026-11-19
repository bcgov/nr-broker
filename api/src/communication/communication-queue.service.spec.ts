import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';

import { BullService } from '../bull/bull.service';
import { REDIS_QUEUES } from '../constants';
import { COMMUNICATION_TASKS } from './communication.constants';
import { CommunicationQueueService } from './communication-queue.service';

describe('CommunicationQueueService', () => {
  let service: CommunicationQueueService;
  const enqueue = vi.fn();

  beforeEach(async () => {
    enqueue.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        CommunicationQueueService,
        { provide: BullService, useValue: { enqueue } },
        { provide: COMMUNICATION_TASKS, useValue: [] },
      ],
    })
      .useMocker(() => ({ recordCommunications: vi.fn() }))
      .compile();
    service = module.get(CommunicationQueueService);
  });

  it('passes TTL deduplication to BullMQ while keeping unique tracking IDs', async () => {
    const deduplication = { id: 'token-expiration-alert:jti:123:3', ttl: 86400000 };

    await service.queue('expiry', 'vertex', [], 'expiry', {}, deduplication);
    await service.queue('expiry', 'vertex', [], 'expiry', {}, deduplication);

    expect(enqueue).toHaveBeenCalledTimes(2);
    for (const [queueName, job, options] of enqueue.mock.calls) {
      expect(queueName).toBe(REDIS_QUEUES.NOTIFICATION_COMS);
      expect(options).toEqual({ jobId: job.uuid, deduplication });
    }
    expect(enqueue.mock.calls[0][1].uuid).not.toBe(enqueue.mock.calls[1][1].uuid);
  });

  it('does not deduplicate notifications unless requested', async () => {
    await service.queue('test', 'vertex', [], 'test', {});
    await service.queue('test', 'vertex', [], 'test', {});

    expect(enqueue).toHaveBeenCalledTimes(2);
    for (const [, job, options] of enqueue.mock.calls) {
      expect(options).toEqual({ jobId: job.uuid });
    }
    expect(enqueue.mock.calls[0][1].uuid).not.toBe(enqueue.mock.calls[1][1].uuid);
  });

  it('propagates enqueue errors so a later scan can try again', async () => {
    const error = new Error('Queue unavailable');
    enqueue.mockRejectedValueOnce(error);

    await expect(
      service.queue('expiry', 'vertex', [], 'expiry', {}, { id: 'alert', ttl: 86400000 }),
    ).rejects.toBe(error);
  });
});
