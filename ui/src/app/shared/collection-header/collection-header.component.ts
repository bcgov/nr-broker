import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { CollectionConfigMap } from '../../service/graph.types';

@Component({
  selector: 'app-collection-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatIconModule,
    InspectorTeamComponent,
  ],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent implements OnChanges {
  @Input() collection!: CollectionNames;
  @Input() name!: string;
  @Input() screenSize!: string;
  @Input() backSteps = 1;

  config: CollectionConfigRestDto | undefined;

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit(): void {
    this.config = this.configMap[this.collection];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collection']) {
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
