import { Component, input, inject, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GraphDirectedCombo } from '../../service/persistence/dto/collection-combo.dto';

@Component({
  selector: 'app-collection-header',
  imports: [MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly configMap = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  // readonly screen = inject(ScreenService);

  // Inputs - required
  readonly collection = input.required<CollectionNames>();
  readonly title = input.required<string>();
  // readonly screenSize = input.required<string>();
  // Inputs - optional
  readonly backIcon = input<'arrow_upward' | 'arrow_back'>('arrow_upward');
  readonly upstream = input<GraphDirectedCombo[]>();

  protected config = computed(() => {
    return this.configMap[this.collection()];
  });
  protected parentName = computed(() => {
    const config = this.config();
    const upstreamValue = this.upstream();
    if (config?.parent?.edgeName && upstreamValue) {
      for (const upstream of upstreamValue) {
        if (upstream.edge.name === config.parent.edgeName) {
          return upstream.vertex.name;
        }
      }
    }
    return '';
  });

  back() {
    const backCommands = this.activatedRoute.snapshot.data['backCommands'] ?? ['..'];
    this.router.navigate(backCommands, { relativeTo: this.activatedRoute });
  }

  isBackDisabled() {
    return !this.config()?.permissions.browse;
  }
}
