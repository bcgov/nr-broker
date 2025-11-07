import { Component, OnChanges, SimpleChanges, input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GraphDirectedCombo } from '../../service/persistence/dto/collection-combo.dto';

@Component({
  selector: 'app-collection-header',
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent implements OnChanges, OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly configMap = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  // Inputs
  readonly collection = input.required<CollectionNames>();
  readonly name = input.required<string>();
  readonly screenSize = input.required<string>();
  readonly backSteps = input(1);
  readonly navigateCommands = input<any>();
  readonly backIcon = input<'arrow_upward' | 'arrow_back'>('arrow_upward');
  readonly upstream = input<GraphDirectedCombo[]>();

  protected parentName = signal('');
  protected config = signal<CollectionConfigDto | undefined>(undefined);

  ngOnInit(): void {
    this.parentName.set('');
    this.config.set(this.configMap[this.collection()]);
    const upstreamValue = this.upstream();
    const config = this.config();
    if (config?.parent?.edgeName && upstreamValue) {
      for (const upstream of upstreamValue) {
        if (upstream.edge.name === config.parent.edgeName) {
          this.parentName.set(upstream.vertex.name);
          break;
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collection'] || changes['upstream']) {
      this.ngOnInit();
    }
  }

  back() {
    const command = [new Array(this.backSteps()).fill('..').join('/')];
    const navigateCommands = this.navigateCommands();
    if (navigateCommands) {
      command.push(navigateCommands);
    }
    this.router.navigate(command, { relativeTo: this.activatedRoute });
  }

  isBrowseDisabled() {
    return !this.config()?.permissions.browse;
  }
}
