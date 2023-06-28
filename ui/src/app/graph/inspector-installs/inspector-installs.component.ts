import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { BrokerServiceInstanceRestDto } from '../../service/dto/service-instance-rest.dto';

@Component({
  selector: 'app-inspector-installs',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatListModule],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent {
  @Input() instance!: BrokerServiceInstanceRestDto | undefined;
}
