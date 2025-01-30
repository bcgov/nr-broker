import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { from, map } from 'rxjs';
import merge from 'lodash.merge';
import os from 'os';
import snakecaseKeys from 'snakecase-keys';

import { AuditStreamerService } from './audit-streamer.service';
import { EdgeEntity } from '../persistence/entity/edge.entity';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { ActionError } from '../intention/action.error';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';
import { ArtifactEmbeddable } from '../intention/entity/artifact.embeddable';
import { UserEmbeddable } from '../intention/entity/user.embeddable';
import { APP_ENVIRONMENT } from '../constants';
import { UserUtil } from '../util/user.util';

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
  private readonly metadataActivity = {};
  private readonly metadataHttpAccess = {};

  /**
   * Constructs the audit service
   * @param stream The service used to persist audit logs
   */
  constructor(
    private readonly stream: AuditStreamerService,
    private readonly userUtil: UserUtil,
  ) {
    if (process.env.BROKER_AUDIT_INDEX_BROKER_AUDIT) {
      this.metadataActivity['@metadata'] = {
        index: process.env.BROKER_AUDIT_INDEX_BROKER_AUDIT,
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
    intention: IntentionEntity,
    success: boolean,
    exception: HttpException | null,
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
        map(this.addErrorFunc(exception)),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataActivityFunc()),
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
  public recordActionAuthorization(
    req: any,
    intention: IntentionEntity,
    actionFailures: ActionError[],
  ) {
    const now = new Date();
    for (const action of intention.actions) {
      const failure = actionFailures.find(
        (failure) => action.id === failure.data.action_id,
      );

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
          map(this.addActionFunc(intention, action)),
          map(this.addEcsFunc),
          map(
            this.addErrorFunc(
              failure
                ? new BadRequestException({
                    message: failure.message,
                    error: failure.data,
                  })
                : null,
            ),
          ),
          map(this.addHostFunc),
          map(this.addLabelsFunc),
          map(this.addMetadataActivityFunc()),
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
    intention: IntentionEntity,
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
        map(this.addMetadataActivityFunc()),
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
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
        map(this.addActionFunc(intention, action)),
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataActivityFunc()),
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
    assignObj: any,
    exception: HttpException | null = null,
    artifact: ArtifactEmbeddable | null = null,
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
        map(this.addActionFunc(intention, action, artifact)),
        map(this.addEcsFunc),
        map(this.addErrorFunc(exception)),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addAssignFunc(assignObj)),
        map(this.addMetadataActivityFunc()),
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
        map(this.addMetadataActivityFunc()),
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
    graphObj:
      | string
      | VertexEntity
      | VertexInsertDto
      | EdgeEntity
      | EdgeInsertDto,
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
        map(this.addMetadataActivityFunc()),
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
        map(this.addMetadataActivityFunc()),
        map(this.addServiceFunc),
        map(this.addSourceFunc(req)),
        map(this.addTimestampFunc()),
        map(this.addUserAgentFunc(req)),
      )
      .subscribe((ecsObj) => {
        this.stream.putRecord(ecsObj);
      });
  }

  public recordPackageBuildApprove(
    req: any,
    user: any,
    outcome: 'success' | 'failure' | 'unknown',
  ) {
    from([
      {
        event: {
          action: 'package-approval',
          category: 'configuration',
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
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addMetadataActivityFunc()),
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
   * Records tool sync events in the audit activity log
   * @param type
   * @param outcome
   * @param message
   * @param project
   * @param service
   * @param failure
   */
  public recordToolsSync(
    type: 'start' | 'end' | 'info',
    outcome: 'success' | 'failure' | 'unknown',
    message: string,
    project?: string,
    service?: string,
    failure?: HttpException,
  ) {
    from([
      {
        message,
        event: {
          action: 'sync-tools',
          category: 'configuration',
          dataset: 'broker.audit',
          kind: 'event',
          type,
          outcome,
        },
        ...(project
          ? {
              labels: {
                target_project: project,
              },
            }
          : {}),
        ...(service
          ? {
              service: {
                target: {
                  name: service,
                  environment: 'tools',
                },
              },
            }
          : {}),
      },
    ])
      .pipe(
        map(this.addEcsFunc),
        map(this.addHostFunc),
        map(this.addLabelsFunc),
        map(this.addErrorFunc(failure)),
        map(this.addMetadataActivityFunc()),
        map(this.addServiceFunc),
        map(this.addTimestampFunc()),
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
   * Removes undefined or empty keys from object (shallow)
   * @param obj The object to manipulate
   * @returns The object with no undefined keys
   */
  private removeEmpty(obj: any) {
    Object.keys(obj).forEach(
      (key) =>
        (obj[key] === undefined || Object.keys(obj[key]).length === 0) &&
        delete obj[key],
    );
    return obj;
  }

  /**
   * Map function generator for adding http exceptions to ECS document
   * @param exception The HttpException to add as error
   * @returns Function to manipulate the ECS document
   */
  private addErrorFunc(exception: HttpException | null) {
    return (ecsObj: any) => {
      if (!exception) {
        return ecsObj;
      }
      const response = exception.getResponse();
      return merge(ecsObj, {
        error: {
          code: exception.getStatus(),
          message: exception.message,
          structured_data:
            typeof response === 'object'
              ? { error: (response as any).error }
              : response,
          type: exception.name,
        },
      });
    };
  }

  /**
   * Map function generator for adding intention action fields to ECS document
   * @param action The action DTO
   * @returns Function to manipulate the ECS document
   */
  private addActionFunc(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    artifact: ArtifactEmbeddable = undefined,
  ) {
    return (ecsObj: any) => {
      return merge(
        ecsObj,
        this.removeEmpty({
          cloud: action.cloud,
          labels: {
            action_id: action.id,
            target_project: action.service.target
              ? action.service.target.project
              : action.service.project,
          },
          package: snakecaseKeys({
            ...(artifact ?? {}),
            ...(action.package ?? {}),
          }),
          service: {
            target: {
              name: action.service.name,
              environment: action.service.environment,
            },
            ...(action.service.target
              ? {
                  origin: {
                    name: action.service.name,
                    environment: action.service.environment,
                  },
                  target: {
                    name: action.service.target.name,
                    environment: action.service.target.environment,
                  },
                }
              : {}),
          },
          trace: {
            id: action.trace.hash,
          },
          transaction: {
            id: intention.transaction.hash,
          },
        }),
      );
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
        version: '8.11.0',
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
    graphObj:
      | string
      | VertexEntity
      | VertexInsertDto
      | EdgeEntity
      | EdgeInsertDto,
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
      graphObj instanceof VertexEntity ||
      graphObj instanceof VertexInsertDto
    ) {
      return (ecsObj: any) => {
        return merge(ecsObj, {
          graph: {
            ...(graphObj instanceof VertexEntity
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
            ...(graphObj.prop ? { prop: graphObj.prop } : {}),
          },
        });
      };
    } else {
      return (ecsObj: any) => {
        return merge(ecsObj, {
          graph: {
            ...(graphObj instanceof EdgeEntity
              ? {
                  id: graphObj.id.toString(),
                }
              : {}),
            ...{
              name: graphObj.name,
              set: 'edge',
              edge: {
                source: graphObj.source ? graphObj.source.toString() : '',
                target: graphObj.target ? graphObj.target.toString() : '',
              },
              ...(graphObj.prop ? { prop: graphObj.prop } : {}),
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
  private addMetadataActivityFunc() {
    return (ecsObj: any) => merge(ecsObj, this.metadataActivity);
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
      const loggedInUser = this.userUtil.mapUserToUserRolesDto(
        '',
        (req.user as any).userinfo,
      );
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
        environment: APP_ENVIRONMENT ?? 'unknown',
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
  private addUserFunc(user: UserEmbeddable | null) {
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
