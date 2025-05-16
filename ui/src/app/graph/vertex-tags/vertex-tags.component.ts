import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnChanges, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { VertexPointerDto } from '../../service/persistence/dto/vertex-pointer.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-vertex-tags',
  imports: [CommonModule, RouterModule, MatChipsModule],
  templateUrl: './vertex-tags.component.html',
  styleUrl: './vertex-tags.component.scss',
})
export class VertexTagsComponent implements OnInit, OnChanges {
  @Input()
  collection!: CollectionNames;
  @Input()
  collectionData!: VertexPointerDto;

  public config!: CollectionConfigDto;

  constructor(
    private readonly router: Router,
    @Inject(CONFIG_RECORD)
    private readonly configRecord: CollectionConfigNameRecord,
  ) {}

  ngOnInit(): void {
    this.config = this.configRecord[this.collection];
  }

  ngOnChanges(): void {
    this.ngOnInit();
  }

  browseTag(tag: string) {
    this.router.navigate([`/browse/${this.collection}`, { tags: [tag] }]);
  }
}
