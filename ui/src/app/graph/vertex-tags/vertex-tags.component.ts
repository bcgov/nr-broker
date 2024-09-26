import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnChanges, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { VertexPointerRestDto } from '../../service/dto/vertex-pointer-rest.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionConfigMap } from '../../service/graph.types';

@Component({
  selector: 'app-vertex-tags',
  standalone: true,
  imports: [CommonModule, RouterModule, MatChipsModule],
  templateUrl: './vertex-tags.component.html',
  styleUrl: './vertex-tags.component.scss',
})
export class VertexTagsComponent implements OnInit, OnChanges {
  @Input()
  collection!: string;
  @Input()
  collectionData!: VertexPointerRestDto;

  public config!: CollectionConfigRestDto;

  constructor(
    private readonly router: Router,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit(): void {
    this.config = this.configMap[this.collection];
  }

  ngOnChanges(): void {
    this.ngOnInit();
  }

  browseTag(tag: string) {
    this.router.navigate([`/browse/${this.collection}`, { tags: [tag] }]);
  }
}
