import { Inject, Injectable, MessageEvent } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { Observable, Subject } from 'rxjs';
import { REDIS_PUBSUB, REDIS_QUEUES } from '../constants';

type EventSourceKeys = keyof typeof REDIS_PUBSUB;
type QueueSourceKeys = keyof typeof REDIS_QUEUES;

type EventSourceMap = {
  [key in EventSourceKeys]: Subject<MessageEvent>;
};

@Injectable()
export class RedisService {
  private readonly eventSourceMap: EventSourceMap = Object.values(
    REDIS_PUBSUB,
  ).reduce((pv, cv) => {
    return {
      [cv]: new Subject<MessageEvent>(),
      ...pv,
    };
  }, {}) as EventSourceMap;

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: RedisClientType,
  ) {
    const subscriber = this.client.duplicate();
    subscriber.on('error', (err) => console.error(err));
    subscriber.connect().then(() => {
      for (const value of Object.values(REDIS_PUBSUB)) {
        subscriber.subscribe(value, (message) => {
          this.eventSourceMap[value].next(JSON.parse(message));
        });
      }
    });
  }

  public getEventSource(source: string): Observable<MessageEvent> {
    return this.eventSourceMap[source];
  }

  public async queue(
    name: (typeof REDIS_QUEUES)[QueueSourceKeys],
    value: string,
    unique = true,
  ) {
    if (!unique || (await this.client.lPos(name, value)) === null) {
      this.client.lPush(name, value);
    }
  }

  public dequeue(name: (typeof REDIS_QUEUES)[QueueSourceKeys]) {
    return this.client.rPop(name);
  }

  public publish(
    channel: (typeof REDIS_PUBSUB)[EventSourceKeys],
    event: MessageEvent,
  ) {
    this.client.publish(channel, JSON.stringify(event));
  }
}
