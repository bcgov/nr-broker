import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { CollectionConfigMap } from '../../service/graph.types';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';

@Component({
  selector: 'app-collection-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent implements OnChanges {
  @Input() collection!: CollectionNames;
  @Input() name!: string;
  @Input() screenSize!: string;
  @Input() backSteps = 1;
  @Input() upstream: GraphDirectedRestCombo[] | undefined = undefined;
  parentName = '';

  config: CollectionConfigRestDto | undefined;

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit(): void {
    this.parentName = '';
    this.config = this.configMap[this.collection];
    if (this.config.parent?.edgeName && this.upstream) {
      for (const upstream of this.upstream) {
        if (upstream.edge.name === this.config.parent.edgeName) {
          this.parentName = upstream.vertex.name;
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
    const command = [new Array(this.backSteps).fill('..').join('/')];
    this.router.navigate(command, { relativeTo: this.activatedRoute });
  }

  isBrowseDisabled() {
    return !this.config?.permissions.browse;
  }
}
