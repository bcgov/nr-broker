import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { CloudEntity } from './cloud.entity';

@Entity({ discriminatorValue: 'openshift' })
export class CloudOpenShiftEntity extends CloudEntity {
  @Property({ nullable: true })
  consoleUrl?: string;

  @Property({ nullable: true })
  clusterName?: string;

  @Property({ nullable: true })
  apiUrl?: string;
}
