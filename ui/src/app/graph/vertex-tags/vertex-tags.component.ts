import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { VertexPointerRestDto } from '../../service/dto/vertex-pointer-rest.dto';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-vertex-tags',
  standalone: true,
  imports: [CommonModule, RouterModule, MatChipsModule],
  templateUrl: './vertex-tags.component.html',
  styleUrl: './vertex-tags.component.scss',
})
export class VertexTagsComponent {
  @Input()
  collection!: string;
  @Input()
  collectionData!: VertexPointerRestDto;

  constructor(private readonly router: Router) {}

  browseTag(tag: string) {
    this.router.navigate([`/browse/${this.collection}`, { tags: [tag] }]);
  }
}
