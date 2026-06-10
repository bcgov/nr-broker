import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { GraphRolePermissionRuleDto } from '../../service/graph/dto/graph-role-permission-rule.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

export interface BrokerRoleSudoCollection {
  collection: string;
  title: string;
  sudoHelp?: string;
}

export interface BrokerRoleMappingDialogData {
  roleName: string;
  chipLabel: 'sudo' | 'update' | 'approve' | 'Change';
  rules: GraphRolePermissionRuleDto[];
  sudoCollections: BrokerRoleSudoCollection[];
  changeEnvironments: string[];
}

interface PathNode {
  id: string;
  name: string;
  category: number;
  symbol: string;
  symbolSize: number;
  x?: number;
  y?: number;
  itemStyle?: {
    color: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

interface PathLink {
  source: string;
  target: string;
  lineStyle?: { opacity: number };
}

interface CollectionLegendItem {
  collection: CollectionNames;
  title: string;
  color: string;
}

interface LinkMeta {
  edgeNames: Set<string>;
  permissions: Set<string>;
}

interface PermissionNodeStyle {
  symbol: string;
  symbolSize: number;
  borderColor: string;
  borderWidth: number;
}

@Component({
  selector: 'app-broker-role-mapping-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './broker-role-mapping-dialog.component.html',
  styleUrl: './broker-role-mapping-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BrokerRoleMappingDialogComponent implements OnInit {
  readonly data = inject<BrokerRoleMappingDialogData>(MAT_DIALOG_DATA);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  echartsOptions!: EChartsCoreOption;
  dedupedRules: GraphRolePermissionRuleDto[] = [];
  collectionLegend: CollectionLegendItem[] = [];

  ngOnInit() {
    this.dedupedRules = this.deduplicatePaths(this.data.rules);
    this.echartsOptions = this.buildGraphChart();
  }

  private deduplicatePaths(rules: GraphRolePermissionRuleDto[]): GraphRolePermissionRuleDto[] {
    // Graph mode deduplicates shared path segments by reusing node and link ids.
    // Keep full chains so path always starts at user.
    return rules;
  }

  private buildGraphChart(): EChartsCoreOption {
    const nodes: PathNode[] = [];
    const links: PathLink[] = [];
    const nodeMap = new Set<string>();
    const linkMap = new Set<string>();
    const linkMetaMap = new Map<string, LinkMeta>();
    const collectionPermissionMap = new Map<CollectionNames, Set<string>>();
    const usedCollections = new Set<CollectionNames>();

    const getCollectionColor = (collection: CollectionNames) => {
      const raw = this.configRecord[collection]?.color;
      if (!raw) {
        return '#90A4AE';
      }
      return raw.startsWith('#') ? raw : `#${raw}`;
    };

    const getPermissionNodeStyle = (
      permissions: Set<string>,
    ): PermissionNodeStyle => {
      if (permissions.has('sudo')) {
        return {
          symbol: 'diamond',
          symbolSize: 44,
          borderColor: '#B71C1C',
          borderWidth: 4,
        };
      }
      if (permissions.has('delete')) {
        return {
          symbol: 'triangle',
          symbolSize: 42,
          borderColor: '#6A1B9A',
          borderWidth: 3,
        };
      }
      if (permissions.has('update')) {
        return {
          symbol: 'roundRect',
          symbolSize: 40,
          borderColor: '#EF6C00',
          borderWidth: 3,
        };
      }
      if (permissions.has('approve')) {
        return {
          symbol: 'pin',
          symbolSize: 40,
          borderColor: '#2E7D32',
          borderWidth: 3,
        };
      }
      return {
        symbol: 'circle',
        symbolSize: 38,
        borderColor: '#455A64',
        borderWidth: 2,
      };
    };

    const ensureNode = (collection: CollectionNames) => {
      if (!nodeMap.has(collection)) {
        nodeMap.add(collection);
        nodes.push({
          id: collection,
          name: this.configRecord[collection]?.name ?? collection,
          category: 0,
          symbol: 'circle',
          symbolSize: 38,
          itemStyle: {
            color: getCollectionColor(collection),
            borderColor: '#455A64',
            borderWidth: 2,
          },
        });
      }
    };

    const ensureCollectionPermissionSet = (collection: CollectionNames) => {
      if (!collectionPermissionMap.has(collection)) {
        collectionPermissionMap.set(collection, new Set<string>());
      }
      return collectionPermissionMap.get(collection)!;
    };

    usedCollections.add('user');
    ensureNode('user');

    for (const rule of this.dedupedRules) {
      let currentCollection: CollectionNames = 'user';

      for (const step of rule.steps) {
        const collection = step.vertexCollection;
        usedCollections.add(collection);
        ensureNode(collection);

        const permissionSet = ensureCollectionPermissionSet(collection);
        for (const permission of step.permissions) {
          permissionSet.add(permission);
        }

        const linkKey = `${currentCollection}->${collection}`;

        if (!linkMetaMap.has(linkKey)) {
          linkMetaMap.set(linkKey, {
            edgeNames: new Set<string>(),
            permissions: new Set<string>(),
          });
        }

        const meta = linkMetaMap.get(linkKey)!;
        meta.edgeNames.add(step.edgeName);
        for (const permission of step.permissions) {
          meta.permissions.add(permission);
        }

        if (!linkMap.has(linkKey)) {
          linkMap.add(linkKey);
          links.push({
            source: currentCollection,
            target: collection,
            lineStyle: { opacity: 0.6 },
          });
        }

        currentCollection = collection;
      }
    }

    this.collectionLegend = Array.from(usedCollections)
      .map((collection) => ({
        collection,
        title: this.configRecord[collection]?.name ?? collection,
        color: getCollectionColor(collection),
      }))
      .sort((a, b) => {
        if (a.collection === 'user') {
          return -1;
        }
        if (b.collection === 'user') {
          return 1;
        }
        return a.title.localeCompare(b.title);
      });

    const categoryIndex = new Map<CollectionNames, number>();
    this.collectionLegend.forEach((item, index) => {
      categoryIndex.set(item.collection, index);
    });

    for (const node of nodes) {
      const collection = node.id as CollectionNames;
      node.category = categoryIndex.get(collection) ?? 0;
      const permissionSet = collectionPermissionMap.get(collection) ?? new Set<string>();
      const nodeStyle = getPermissionNodeStyle(permissionSet);
      node.symbol = nodeStyle.symbol;
      node.symbolSize = nodeStyle.symbolSize;
      node.itemStyle = {
        color: getCollectionColor(collection),
        borderColor: nodeStyle.borderColor,
        borderWidth: nodeStyle.borderWidth,
      };
    }

    const outgoingByCollection = new Map<CollectionNames, Set<CollectionNames>>();
    const incomingCountByCollection = new Map<CollectionNames, number>();
    for (const link of links) {
      const source = link.source as CollectionNames;
      const target = link.target as CollectionNames;
      if (!outgoingByCollection.has(source)) {
        outgoingByCollection.set(source, new Set<CollectionNames>());
      }
      outgoingByCollection.get(source)!.add(target);
      incomingCountByCollection.set(target, (incomingCountByCollection.get(target) ?? 0) + 1);
      if (!incomingCountByCollection.has(source)) {
        incomingCountByCollection.set(source, incomingCountByCollection.get(source) ?? 0);
      }
    }

    const depthByCollection = new Map<CollectionNames, number>();
    depthByCollection.set('user', 0);
    const queue: CollectionNames[] = ['user'];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depthByCollection.get(current) ?? 0;
      for (const next of outgoingByCollection.get(current) ?? []) {
        const known = depthByCollection.get(next);
        const candidate = currentDepth + 1;
        if (known === undefined || candidate < known) {
          depthByCollection.set(next, candidate);
          queue.push(next);
        }
      }
    }

    for (const item of this.collectionLegend) {
      if (!depthByCollection.has(item.collection)) {
        depthByCollection.set(item.collection, 1);
      }
    }

    const groupsByDepth = new Map<number, CollectionNames[]>();
    for (const item of this.collectionLegend) {
      const depth = depthByCollection.get(item.collection) ?? 0;
      if (!groupsByDepth.has(depth)) {
        groupsByDepth.set(depth, []);
      }
      groupsByDepth.get(depth)!.push(item.collection);
    }

    for (const [depth, group] of groupsByDepth.entries()) {
      group.sort((a, b) => {
        const aTitle = this.configRecord[a]?.name ?? a;
        const bTitle = this.configRecord[b]?.name ?? b;
        return aTitle.localeCompare(bTitle);
      });

      group.forEach((collection, index) => {
        const node = nodes.find((n) => n.id === collection);
        if (!node) {
          return;
        }
        node.x = 120 + depth * 240;
        node.y = 80 + index * 100;
      });
    }

    return {
      title: {
        text: `${this.data.roleName}`,
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            const key = `${params.data.source}->${params.data.target}`;
            const meta = linkMetaMap.get(key);
            if (!meta) {
              return `${params.data.source} -> ${params.data.target}`;
            }
            const edgeNames = Array.from(meta.edgeNames).join(', ');
            const permissions = Array.from(meta.permissions).join(', ') || 'none';
            return `Edge: ${edgeNames}<br/>Permissions: ${permissions}`;
          }
          const collection = params.data.id as CollectionNames;
          const title = this.configRecord[collection]?.name ?? params.data.name;
          const permissions = Array.from(
            collectionPermissionMap.get(collection) ?? [],
          ).join(', ') || 'none';
          return `${title}<br/>Permissions: ${permissions}`;
        },
      },
      series: [
        {
          type: 'graph',
          data: nodes,
          links,
          categories: this.collectionLegend.map((item) => ({
            name: item.title,
            itemStyle: { color: item.color },
          })),
          roam: true,
          draggable: true,
          layout: 'none',
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 7,
          lineStyle: {
            color: 'source',
            curveness: 0.15,
          },
          label: {
            show: true,
            formatter: (params: any) => params.data.name,
            fontSize: 12,
            position: 'right',
            overflow: 'break',
          },
          emphasis: {
            focus: 'adjacency',
          },
        },
      ],
    };
  }
}
