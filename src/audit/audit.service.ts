import { Injectable, Logger } from '@nestjs/common';
import { from, map } from 'rxjs';
import { ProvisionDto } from '../provision/provision.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
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
        map(this.addTimestampFunc()),
        map(this.addHttpRequestFunc(req)),
        map(this.addSourceFunc(req)),
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
          dataset: 'access',
          duration: endDate.valueOf() - startDate.valueOf(),
          kind: 'event',
        },
      },
    ])
      .pipe(
        map(this.addTimestampFunc(startDate)),
        map(this.addHttpRequestFunc(req)),
        map(this.addHttpResponseFunc(resp)),
        map(this.addSourceFunc(req)),
        map(this.addUrlFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.logger.debug(JSON.stringify(ecsObj));
      });
  }

  private addTimestampFunc(timestamp: Date = new Date()) {
    return (ecsObj: any) => {
      ecsObj['@timestamp'] = timestamp.toISOString();
      return ecsObj;
    };
  }

  private addHttpRequestFunc(req: any) {
    return (ecsObj: any) => {
      if (!ecsObj.http) {
        ecsObj.http = {};
      }
      if (!ecsObj.http.request) {
        ecsObj.http.request = {};
      }

      ecsObj.http.request = {
        method: req.method,
        mime_type: req.headers['content-type'],
        referrer: req.referrer,
        bytes: req.headers['content-length'],
        ...ecsObj.http.request,
      };
      ecsObj.version = req.httpVersion;
      return ecsObj;
    };
  }

  private addHttpResponseFunc(resp: any) {
    return (ecsObj: any) => {
      if (!ecsObj.http) {
        ecsObj.http = {};
      }
      if (!ecsObj.http.reponse) {
        ecsObj.http.reponse = {};
      }

      ecsObj.http.reponse = {
        status_code: resp.statusCode,
        mime_type: resp.get('Content-Type'),
        bytes: resp._contentLength,
        ...ecsObj.http.reponse,
      };
      return ecsObj;
    };
  }

  private addSourceFunc(req: any) {
    return (ecsObj: any) => {
      if (!ecsObj.source) {
        ecsObj.source = {};
      }
      ecsObj.source = {
        ip: req.ip,
        ...ecsObj.source,
      };
      return ecsObj;
    };
  }

  private addUrlFunc(req: any) {
    return (ecsObj: any) => {
      if (!ecsObj.url) {
        ecsObj.url = {};
      }
      ecsObj.url = {
        full: `${req.protocol}://${req.headers.host}${req.url}`,
        ...ecsObj.url,
      };
      return ecsObj;
    };
  }
}
