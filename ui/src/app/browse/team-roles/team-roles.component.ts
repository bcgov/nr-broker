import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';

@Component({
  selector: 'app-team-roles',
  imports: [CommonModule, MatDividerModule, EdgetitlePipe],
  templateUrl: './team-roles.component.html',
  styleUrl: './team-roles.component.scss',
})
export class TeamRolesComponent {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  edges: CollectionEdgeConfig[] = this.configRecord['user'].edges.filter(
    (edge) => edge.collection === 'team',
  );
}
