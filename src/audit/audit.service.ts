import { Injectable, Logger } from '@nestjs/common';
import { from, map } from 'rxjs';
import merge from 'lodash.merge';
import { ProvisionDto } from '../provision/provision.dto';
import { KinesisService } from '../kinesis/kinesis.service';
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly metadataAuth = {};
  private readonly metadataHttpAccess = {};

  constructor(private readonly kinesisService: KinesisService) {
    if (process.env.OS_INDEX_AUTH) {
      this.metadataAuth['@metadata'] = {
        index: process.env.OS_INDEX_AUTH,
      };
    }
    if (process.env.OS_INDEX_HTTP_ACCESS) {
      this.metadataHttpAccess['@metadata'] = {
        index: process.env.OS_INDEX_HTTP_ACCESS,
      };
    }
  }
  recordActivity(provisionDto: ProvisionDto) {
    const startDate = new Date();
    from([
      {
        ...provisionDto,
      },
    ])
      .pipe(map(this.addTimestampFunc(startDate)))
      .subscribe((ecsObj) => {
        this.logger.debug(JSON.stringify(ecsObj));
      });
  }

  recordAuth(req: any, outcome: 'success' | 'failure' | 'unknown') {
    from([
      {
        event: {
          category: 'authentication',
          dataset: 'auth',
          kind: 'end',
          outcome,
        },
      },
    ])
      .pipe(
        map(this.addMetadataAuthFunc()),
        map(this.addHttpRequestFunc(req)),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc()),
      )
      .subscribe((ecsObj) => {
        this.logger.debug(JSON.stringify(ecsObj));
      });
  }

  recordHttpAccess(req: any, resp: any, startDate: Date, endDate: Date) {
    from([
      {
        event: {
          category: 'web',
          dataset: 'express.access',
          duration: endDate.valueOf() - startDate.valueOf(),
          kind: 'event',
        },
      },
    ])
      .pipe(
        map(this.addEcsFunc),
        map(this.addHttpRequestFunc(req)),
        map(this.addHttpResponseFunc(resp)),
        map(this.addMetadataHttpAccessFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(startDate)),
        map(this.addUrlFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.logger.debug(JSON.stringify(ecsObj));
        this.kinesisService.putRecord(`${Date.now()}`, ecsObj);
      });
  }

  private removeUndefined(obj: any) {
    Object.keys(obj).forEach(
      (key) => obj[key] === undefined && delete obj[key],
    );
    return obj;
  }

  private addEcsFunc(ecsObj: any) {
    return merge(ecsObj, {
      ecs: {
        version: '1.12.0',
      },
    });
  }

  private addHttpRequestFunc(req: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        http: {
          request: this.removeUndefined({
            method: req.method,
            mime_type: req.headers['content-type'],
            referrer: req.referrer,
            bytes: req.headers['content-length'],
          }),
        },
      });
    };
  }

  private addHttpResponseFunc(resp: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        http: {
          reponse: {
            status_code: resp.statusCode,
            mime_type: resp.get('Content-Type'),
            bytes: resp._contentLength,
          },
        },
      });
    };
  }

  private addMetadataAuthFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataAuth);
  }

  private addMetadataHttpAccessFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataHttpAccess);
  }

  private addServiceFunc(ecsObj: any) {
    return merge(ecsObj, {
      service: {
        name: 'nr-broker',
        environment: process.env.APP_ENVIRONMENT
          ? process.env.APP_ENVIRONMENT
          : 'unknown',
      },
    });
  }

  private addSourceFunc(req: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        source: {
          ip: req.ip,
        },
      });
    };
  }

  private addTimestampFunc(timestamp: Date = new Date()) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        '@timestamp': timestamp.toISOString(),
      });
    };
  }

  private addUrlFunc(req: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        url: {
          full: `${req.protocol}://${req.headers.host}${req.url}`,
        },
      });
    };
  }
}
