import { CollectionNames } from './collection-dto-union.type';

const COLLECTION_NAME_MAP: Record<string, CollectionNames> = {
  'broker-account': 'brokerAccount',
  'service-instance': 'serviceInstance',
  'openshift-project': 'openshiftProject',
  brokerAccount: 'brokerAccount',
  cloud: 'cloud',
  environment: 'environment',
  openshiftProject: 'openshiftProject',
  project: 'project',
  repository: 'repository',
  server: 'server',
  service: 'service',
  serviceInstance: 'serviceInstance',
  team: 'team',
  user: 'user',
};

export function normalizeCollectionName(
  collection: string | undefined,
): CollectionNames | null {
  if (!collection) {
    return null;
  }

  return COLLECTION_NAME_MAP[collection] ?? null;
}
