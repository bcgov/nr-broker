import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { VertexPointerRestDto } from '../../service/dto/vertex-pointer-rest.dto';

@Component({
  selector: 'app-vertex-tags',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './vertex-tags.component.html',
  styleUrl: './vertex-tags.component.scss',
})
export class VertexTagsComponent {
  @Input()
  collectionData!: VertexPointerRestDto;
}
