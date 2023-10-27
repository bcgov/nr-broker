import { Injectable } from '@nestjs/common';
import { from, map } from 'rxjs';
import merge from 'lodash.merge';
import os from 'os';

import { ActionDto } from '../intention/dto/action.dto';
import { IntentionDto } from '../intention/dto/intention.dto';
import { AuditStreamerService } from './audit-streamer.service';
import { UserDto } from '../intention/dto/user.dto';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { EdgeInsertDto } from '../persistence/dto/edge-rest.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { UserRolesDto } from '../collection/dto/user-roles.dto';

const hostInfo = {
  host: {
    architecture: os.arch(),
    hostname: os.hostname(),
    os: {
      // full: os.version(),
      type: os.platform(),
      version: os.release(),
    },
  },
};

/**
 * Audit service of the broker
 */
@Injectable()
export class AuditService {
  private readonly metadataIntentionActivity = {};
  private readonly metadataAuth = {};
  private readonly metadataHttpAccess = {};

  /**
   * Constructs the audit service
   * @param stream The service used to persist audit logs
   */
  constructor(private readonly stream: AuditStreamerService) {
    if (process.env.BROKER_AUDIT_INDEX_ACTIVITY) {
      this.metadataIntentionActivity['@metadata'] = {
        index: process.env.BROKER_AUDIT_INDEX_ACTIVITY,
      };
    }
    if (process.env.BROKER_AUDIT_INDEX_AUTH) {
      this.metadataAuth['@metadata'] = {
        index: process.env.BROKER_AUDIT_INDEX_AUTH,
      };
    }
    if (process.env.BROKER_AUDIT_INDEX_HTTP_ACCESS) {
      this.metadataHttpAccess['@metadata'] = {
        index: process.env.BROKER_AUDIT_INDEX_HTTP_ACCESS,
      };
    }
  }

  /**
   * Records the open of an intention to the audit activity log
   * @param req The initiating http request
   * @param intention The intention DTO
   * @param success True if the intention was opened successfully and false otherwise
   */
  public recordIntentionOpen(
    req: any,
    intention: IntentionDto,
    success: boolean,
  ) {
    const now = new Date();
    from([
      {
        event: {
          action: 'intention-open',
          category: 'session',
          dataset: 'broker.audit',
          kind: 'event',
          outcome: success ? 'success' : 'failure',
          provider: intention.event.provider,
          reason: intention.event.reason,
          start: intention.transaction.start,
          type: 'start',
          url: intention.event.url,
        },
        transaction: {
          id: intention.transaction.hash,
        },
      },
    ])
      .pipe(
        map(this.addAuthFunc(intention.jwt)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataIntentionActivityFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(now)),
        map(this.addUserFunc(intention.user)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Records the success or failure to validation intention actions in the audit activity log
   * @param req The initiating http request
   * @param intention The intention DTO
   */
  public recordActionAuthorization(req: any, intention: IntentionDto) {
    const now = new Date();
    for (const action of intention.actions) {
      from([
        {
          event: {
            action: `auth-${action.action}`,
            category: 'session',
            dataset: 'broker.audit',
            kind: 'event',
            outcome: action.valid ? 'success' : 'failure',
            provider: intention.event.provider,
            reason: intention.event.reason,
            type: 'info',
            url: intention.event.url,
          },
        },
      ])
        .pipe(
          map(this.addActionFunc(action)),
          map(this.addEcsFunc),
          map(this.addHostFunc),
          map(this.addLabelsFunc),
          map(this.addMetadataIntentionActivityFunc()),
          map(this.addServiceFunc),
          map(this.addSourceFunc(req)),
          map(this.addTimestampFunc(now)),
          map(this.addUserFunc(intention.user)),
        )
        .subscribe((ecsObj) => {
          this.stream.putRecord(ecsObj);
        });
    }
  }

  /**
   * Records the close of an intention to the audit activity log
   * @param req The initiating http request
   * @param intention The intention DTO
   * @param reason The reason for the closure
   */
  public recordIntentionClose(
    req: any,
    intention: IntentionDto,
    reason: string,
  ) {
    const now = new Date();
    // Warning: req can be undefined!
    from([
      {
        event: {
          action: 'intention-close',
          category: 'session',
          dataset: 'broker.audit',
          duration: intention.transaction.duration,
          kind: 'event',
          end: intention.transaction.end,
          outcome: intention.transaction.outcome,
          provider: intention.event.provider,
          reason,
          start: intention.transaction.start,
          type: 'end',
          url: intention.event.url,
        },
        transaction: {
          id: intention.transaction.hash,
        },
      },
    ])
      .pipe(
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataIntentionActivityFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(now)),
        map(this.addUserFunc(intention.user)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Records the lifecycle of an action to the audit activity log
   * @param req The initiating http request
   * @param action The action DTO
   * @param type Start or end of lifecycle
   */
  public recordIntentionActionLifecycle(
    req: any,
    intention: IntentionDto,
    action: ActionDto,
    type: 'start' | 'end',
  ) {
    const now = new Date();
    from([
      this.removeUndefined({
        event: {
          action: `action-${action.action}`,
          category: 'process',
          dataset: 'broker.audit',
          duration: action.trace.duration,
          end: action.trace.end,
          kind: 'event',
          outcome: action.trace.outcome,
          provider: intention.event.provider,
          start: action.trace.start,
          type,
          url: intention.event.url,
        },
      }),
    ])
      .pipe(
        map(this.addActionFunc(action)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataIntentionActivityFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(now)),
        map(this.addUserFunc(action.user)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Records the usage of an intention action in the audit activity log
   * @param req The initiating http request
   * @param action The action DTO
   * @param assignObj An ecs object containing the details of the usage
   */
  public recordIntentionActionUsage(
    req: any,
    intention: IntentionDto,
    action: ActionDto,
    assignObj: any,
  ) {
    const now = new Date();
    from([
      this.removeUndefined({
        event: {
          dataset: 'broker.audit',
          kind: 'event',
          provider: intention.event.provider,
          url: intention.event.url,
        },
      }),
    ])
      .pipe(
        map(this.addActionFunc(action)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addAssignFunc(assignObj)),
        map(this.addMetadataIntentionActivityFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(now)),
        map(this.addUserFunc(action.user)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  public recordAccountTokenLifecycle(
    req: any,
    user: any,
    message: string,
    type: 'creation' | 'info' | 'deletion',
    outcome: 'success' | 'failure' | 'unknown',
    tags: string[],
  ) {
    from([
      {
        message,
        event: {
          action: 'token-generation',
          category: 'iam',
          dataset: 'broker.audit',
          kind: 'event',
          type,
          outcome,
        },
        tags,
      },
    ])
      .pipe(
        map(this.addAuthFunc(user)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataAuthFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc()),
        map(this.addUserAgentFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  public recordGraphAction(
    req: any,
    action: string,
    user: any,
    outcome: 'success' | 'failure' | 'unknown',
    set: 'vertex' | 'edge',
    graphObj: string | VertexDto | VertexInsertDto | EdgeDto | EdgeInsertDto,
  ) {
    from([
      {
        event: {
          action,
          category: 'database',
          dataset: 'broker.audit',
          kind: 'event',
          type: 'change',
          outcome,
        },
      },
    ])
      .pipe(
        map(this.addAuthFunc(user)),
        map(this.addEcsFunc),
        map(this.addGraphObjectFunc(set, graphObj)),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataAuthFunc()),
        map(this.addRequestUserFunc(req)),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc()),
        map(this.addUserAgentFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Records authorization events in the audit activity log
   * @param req The initiating http request
   * @param type Indicates if this is the start or end
   * @param outcome The outcome of the authorization
   */
  public recordAuth(
    req: any,
    user: any,
    type: 'start' | 'end',
    outcome: 'success' | 'failure' | 'unknown',
  ) {
    from([
      {
        event: {
          action: 'authentication',
          category: 'authentication',
          dataset: 'broker.audit',
          kind: 'event',
          type,
          outcome,
        },
      },
    ])
      .pipe(
        map(this.addAuthFunc(user)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataAuthFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc()),
        map(this.addUserAgentFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Records http access to the generic access log
   * @param req The initiating http request
   * @param resp The http response
   * @param startDate The start date of the access
   * @param endDate The end date of the access
   */
  public recordHttpAccess(req: any, resp: any, startDate: Date, endDate: Date) {
    from([
      {
        event: {
          category: 'web',
          dataset: 'generic.access',
          duration: endDate.valueOf() - startDate.valueOf(),
          kind: 'event',
        },
      },
    ])
      .pipe(
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addHttpRequestFunc(req)),
        map(this.addHttpResponseFunc(resp)),
        map(this.addLabelsFunc),
        map(this.addMetadataHttpAccessFunc()),
        // map(this.addRequestUserFunc(req)),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc(startDate)),
        map(this.addUrlFunc(req)),
        map(this.addUserAgentFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  /**
   * Removes undefined keys from object (shallow)
   * @param obj The object to manipulate
   * @returns The object with no undefined keys
   */
  private removeUndefined(obj: any) {
    Object.keys(obj).forEach(
      (key) => obj[key] === undefined && delete obj[key],
    );
    return obj;
  }

  /**
   * Map function generator for adding intention action fields to ECS document
   * @param action The action DTO
   * @returns Function to manipulate the ECS document
   */
  private addActionFunc(action: ActionDto) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        cloud: action.cloud,
        labels: {
          action_id: action.id,
          target_project: action.service.project,
        },
        service: {
          target: {
            name: action.service.name,
            environment: action.service.environment,
          },
        },
        trace: {
          id: action.trace.hash,
        },
        transaction: {
          id: action.transaction.hash,
        },
      });
    };
  }

  /**
   * Map function generator for adding auth fields to ECS document
   * @param user The action DTO
   * @returns Function to manipulate the ECS document
   */
  private addAuthFunc(user: any) {
    return (ecsObj: any) => {
      if (!user) {
        return ecsObj;
      }
      return merge(ecsObj, {
        auth: this.removeUndefined({
          client_id: user?.client_id,
          exp: user?.exp,
          exp_timestamp: this.secondsToISOString(user?.exp),
          iat: user?.iat,
          iat_timestamp: this.secondsToISOString(user?.iat),
          nbf: user?.nbf,
          nbf_timestamp: this.secondsToISOString(user?.nbf),
          jti: user?.jti,
          sub: user?.sub,
        }),
      });
    };
  }

  /**
   * Map function for adding ECS version to ECS document
   * @param ecsObj The ECS document to manipulate
   * @returns The manipulated ECS document
   */
  private addEcsFunc(ecsObj: any) {
    return merge(ecsObj, {
      ecs: {
        version: '8.4.0',
      },
    });
  }

  /**
   * Map function generator for graph objects to ECS document
   * @param resp The http response
   * @returns Function to manipulate the ECS document
   */
  private addGraphObjectFunc(
    set: 'vertex' | 'edge',
    graphObj: string | VertexDto | VertexInsertDto | EdgeDto | EdgeInsertDto,
  ) {
    if (!graphObj) {
      return (ecsObj: any) => ecsObj;
    }
    if (typeof graphObj === 'string') {
      return (ecsObj: any) => {
        return merge(ecsObj, {
          graph: {
            id: graphObj,
            set,
          },
        });
      };
    } else if (
      graphObj instanceof VertexDto ||
      graphObj instanceof VertexInsertDto
    ) {
      return (ecsObj: any) => {
        return merge(ecsObj, {
          graph: {
            ...(graphObj instanceof VertexDto
              ? {
                  id: graphObj.id.toString(),
                  name: graphObj.name,
                }
              : {}),
            ...{
              set: 'vertex',
              vertex: {
                collection: graphObj.collection,
              },
            },
          },
        });
      };
    } else {
      return (ecsObj: any) => {
        return merge(ecsObj, {
          graph: {
            ...(graphObj instanceof EdgeDto
              ? {
                  id: graphObj.id.toString(),
                }
              : {}),
            ...{
              name: graphObj.name,
              set: 'edge',
              edge: {
                source: graphObj.source.toString(),
                target: graphObj.target.toString(),
              },
            },
          },
        });
      };
    }
  }

  /**
   * Map function for adding host info to ECS document
   * @param ecsObj The ECS document to manipulate
   * @returns The manipulated ECS document
   */
  private addHostFunc(ecsObj: any) {
    return merge(ecsObj, hostInfo);
  }

  /**
   * Map function generator for adding http request fields to ECS document
   * @param req The http request
   * @returns Function to manipulate the ECS document
   */
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
          version: req.httpVersion,
        },
      });
    };
  }

  /**
   * Map function generator for adding http response fields to ECS document
   * @param resp The http response
   * @returns Function to manipulate the ECS document
   */
  private addHttpResponseFunc(resp: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        http: {
          response: {
            status_code: resp.statusCode,
            mime_type: resp.get('Content-Type'),
            bytes: resp._contentLength,
          },
        },
      });
    };
  }

  /**
   * Map function for adding broker labels to ECS document
   * @param ecsObj The ECS document to manipulate
   * @returns The manipulated ECS document
   */
  private addLabelsFunc(ecsObj: any) {
    return merge(ecsObj, {
      labels: {
        project: 'nr-broker',
      },
    });
  }

  /**
   * Map function generator for merging partial ECS document to ECS document
   * @param obj The object to assign
   * @returns Function to manipulate the ECS document
   */
  private addAssignFunc(obj: any) {
    return (ecsObj: any) => {
      return merge(ecsObj, obj);
    };
  }

  /**
   * Map function generator for adding audit activity metadata to ECS document.
   * This allows dev environments to send data to a temporary index.
   * @returns Function to generate partial ECS document
   */
  private addMetadataIntentionActivityFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataIntentionActivity);
  }

  /**
   * Map function generator for adding authentication activity metadata to ECS document.
   * This allows dev environments to send data to a temporary index.
   * @returns Function to generate partial ECS document
   */
  private addMetadataAuthFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataAuth);
  }

  /**
   * Map function generator for adding http activity metadata to ECS document.
   * This allows dev environments to send data to a temporary index.
   * @returns Function to generate partial ECS document
   */
  private addMetadataHttpAccessFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataHttpAccess);
  }

  /**
   * Map function generator for adding request user to ECS document
   * @param req The http request
   * @returns Function to generate partial ECS document
   */
  private addRequestUserFunc(req: any) {
    if (!req || !req.user) {
      return (ecsObj: any) => ecsObj;
    }

    return (ecsObj: any) => {
      const loggedInUser = new UserRolesDto('', (req.user as any).userinfo);
      return merge(ecsObj, {
        user: this.removeUndefined({
          domain: loggedInUser.domain,
          email: loggedInUser.email,
          full_name: loggedInUser.name,
          id: loggedInUser.guid,
          name: loggedInUser.username,
          roles: loggedInUser.roles,
        }),
      });
    };
  }

  /**
   * Map function for adding broker service details to ECS document.
   * @param ecsObj The ECS document to manipulate
   * @returns The manipulated ECS document
   */
  private addServiceFunc(ecsObj: any) {
    return merge(ecsObj, {
      service: {
        name: 'nr-broker-backend',
        environment: process.env.APP_ENVIRONMENT
          ? process.env.APP_ENVIRONMENT
          : 'unknown',
      },
    });
  }

  /**
   * Map function generator for adding request source to ECS document
   * @param req The http request
   * @returns Function to generate partial ECS document
   */
  private addSourceFunc(req: any) {
    if (!req) {
      return (ecsObj: any) => ecsObj;
    }

    return (ecsObj: any) => {
      return merge(ecsObj, {
        source: {
          ip: req.headers['x-forwarded-for']
            ? req.headers['x-forwarded-for']
            : req.ip,
        },
      });
    };
  }

  /**
   * Map function generator for adding timestamp to ECS document
   * @param timestamp The date to timestamp the document with
   * @returns Function to manipulate the ECS document
   */
  private addTimestampFunc(timestamp: Date = new Date()) {
    return (ecsObj: any) => {
      return merge(ecsObj, {
        '@timestamp': timestamp.toISOString(),
      });
    };
  }

  /**
   * Map function generator for adding request url to ECS document
   * @param req The http request
   * @returns Function to manipulate the ECS document
   */
  private addUrlFunc(req: any) {
    if (!req) {
      return (ecsObj: any) => ecsObj;
    }
    return (ecsObj: any) => {
      return merge(ecsObj, {
        url: {
          original: `${req.protocol}://${req.headers.host}${req.url}`,
        },
      });
    };
  }

  /**
   * Map function generator for adding user to ECS document
   * @param user The user
   * @returns Function to manipulate the ECS document
   */
  private addUserFunc(user: UserDto | null) {
    if (!user) {
      return (ecsObj: any) => ecsObj;
    }

    return (ecsObj: any) => {
      return merge(ecsObj, {
        user: this.removeUndefined({
          domain: user.domain,
          email: user.email,
          full_name: user.full_name,
          group: user.group
            ? this.removeUndefined({
                domain: user.group.domain,
                id: user.group.id,
                name: user.group.name,
              })
            : undefined,
          id: user.id,
          name: user.name,
        }),
      });
    };
  }

  /**
   * Map function generator for adding request user agent to ECS document
   * @param req The http request
   * @returns Function to manipulate the ECS document
   */
  private addUserAgentFunc(req: any) {
    if (!req) {
      return (ecsObj: any) => ecsObj;
    }
    return (ecsObj: any) => {
      return merge(ecsObj, {
        user_agent: this.removeUndefined({
          original: req.headers['user-agent'],
        }),
      });
    };
  }

  /**
   * Converts seconds since unix epoch to ISO string date
   * @param seconds The seconds since unix epoch
   * @returns ISO string date
   */
  private secondsToISOString(seconds: number | undefined): string | undefined {
    if (!seconds) {
      return undefined;
    }
    return new Date(seconds * 1000).toISOString();
  }
}
