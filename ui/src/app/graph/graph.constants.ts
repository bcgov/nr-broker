import { CollectionConfig } from './graph.types';

export const COLLECTION_CONFIG: CollectionConfig = {
  environment: {
    edges: [],
    fields: {
      name: {
        type: 'string',
      },
      short: {
        type: 'string',
      },
    },
    vertex: {
      property: {
        label: 'collection::name',
      },
    },
  },
  project: {
    edges: [
      {
        collection: 'service',
        name: 'component',
        relation: 'oneToMany',
      },
    ],
    fields: {
      name: {
        type: 'string',
      },
      key: {
        type: 'string',
      },
    },
    vertex: {
      property: {
        label: 'collection::name',
      },
    },
  },
  service: {
    edges: [
      {
        collection: 'serviceInstance',
        name: 'instance',
        relation: 'oneToMany',
      },
    ],
    fields: {
      name: {
        type: 'string',
      },
      configuration: {
        type: 'json',
      },
    },
    vertex: {
      property: {
        label: 'collection::name',
      },
    },
  },
  serviceInstance: {
    edges: [
      {
        collection: 'environment',
        name: 'deploy-type',
        inboundName: 'Instance',
        namePath: 'instance',
        relation: 'oneToOne',
      },
      {
        collection: 'serviceInstance',
        name: 'requires',
        inboundName: 'Required By',
        namePath: 'instance',
        relation: 'oneToMany',
      },
    ],
    fields: {
      name: {
        type: 'string',
      },
      key: {
        type: 'string',
      },
    },
    vertex: {
      property: {
        label: 'collection::name',
      },
    },
  },
};
