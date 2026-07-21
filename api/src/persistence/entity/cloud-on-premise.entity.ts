import { Entity } from '@mikro-orm/decorators/legacy';
import { CloudEntity } from './cloud.entity';

@Entity({ discriminatorValue: 'on-premise' })
export class CloudOnPremiseEntity extends CloudEntity {}
