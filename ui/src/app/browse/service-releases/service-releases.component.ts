import { Component, Input } from '@angular/core';
import { CollectionCombo } from '../../service/dto/collection-search-result.dto';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { InspectorInstancesComponent } from '../../graph/inspector-instances/inspector-instances.component';
import { InspectorServiceReleasesComponent } from '../../graph/inspector-service-releases/inspector-service-releases.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-service-releases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    InspectorInstancesComponent,
    InspectorServiceReleasesComponent,
  ],
  templateUrl: './service-releases.component.html',
  styleUrl: './service-releases.component.scss',
})
export class ServiceReleasesComponent {
  @Input() comboData!: CollectionCombo<any>;
  @Input() hasApprove = false;
  @Input() hasSudo = false;
  @Input() serviceDetails: any = null;

  public show = 'version';
}
