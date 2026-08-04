import { Component, input, output, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionConfigDto, CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { GraphDirectedCombo, GraphDirectedComboMap } from '../../service/persistence/dto/collection-combo.dto';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_ARR, CONFIG_RECORD } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';
import { EdgetitleinboundPipe } from '../../util/edgetitleinbound.pipe';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { PreferencesService } from '../../preferences.service';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { GraphUtilService } from '../../service/graph-util.service';

@Component({
  selector: 'app-inspector-connections-direction',
  imports: [
    CommonModule,
    EdgetitleinboundPipe,
    EdgetitlePipe,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-connections-direction.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inspector-connections-direction.component.scss',
})
export class InspectorConnectionsDirectionComponent {
  private readonly preferences = inject(PreferencesService);
  private readonly colorUtil = inject(ColorUtilService);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  readonly configArr = inject<CollectionConfigDto[]>(CONFIG_ARR);
  readonly graphUtilService = inject(GraphUtilService);

  readonly direction = input.required<'inbound' | 'outbound'>();
  readonly config = input.required<CollectionConfigDto>();
  readonly edges = input.required<GraphDirectedCombo[]>();
  readonly hasAdmin = input.required<boolean>();
  readonly hideRestricted = input<boolean>(true);

  readonly selected = output<EdgeDto | VertexDto>();
  readonly addEdge = output<void>();
  readonly deleteEdges = output<GraphDirectedComboMap>();

  connections = computed<GraphDirectedComboMap>(() => {
    return this.groupEdges(this.edges(), this.hideRestricted());
  });

  hiddenCount = computed(() => {
    if (!this.hideRestricted()) {
      return 0;
    }
    return this.edges().filter((combo) => combo.edge.restrict).length;
  });

  restrictedShown = computed(() =>
    !this.hideRestricted() && this.edges().findIndex((combo) => combo.edge.restrict) >= 0);

  private groupEdges(comboArr: GraphDirectedCombo[], hideRestricted: boolean): GraphDirectedComboMap {
    const map: GraphDirectedComboMap = {};
    for (const combo of comboArr) {
      if (hideRestricted && combo.edge.restrict) {
        continue;
      }
      if (!map[combo.edge.name]) {
        map[combo.edge.name] = [];
      }
      map[combo.edge.name].push(combo);
    }
    return map;
  }

  findEdgeConfigByCombo(combo: GraphDirectedCombo): CollectionEdgeConfig | undefined {
    const sourceCollection = this.configArr[combo.edge.is];
    const it = combo.edge.it;
    return sourceCollection?.edges.find(
      (e) => this.configRecord[e.collection].index === it && e.name === combo.edge.name,
    );
  }

  navigateConnection($event: MouseEvent, item: GraphDirectedCombo) {
    const isEdgeNav = this.preferences.get('graphFollows') === 'edge';
    if ($event.altKey ? !isEdgeNav : isEdgeNav) {
      this.selected.emit(item.edge);
    } else {
      this.selected.emit(item.vertex);
    }
  }

  getVisibleTextColor(backgroundColor: string): string {
    return this.colorUtil.getSurfaceColor(backgroundColor);
  }
}
