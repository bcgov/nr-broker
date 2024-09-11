import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import { IntentionActionPointerRestDto } from '../../service/dto/intention-action-pointer-rest.dto';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';

@Component({
  selector: 'app-service-instance-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    OutcomeIconComponent,
  ],
  templateUrl: './service-instance-details.component.html',
  styleUrl: './service-instance-details.component.scss',
})
export class ServiceInstanceDetailsComponent {
  @Input() instance!: any | undefined;
  @Input() showName!: boolean;
  serverSelection: any | undefined;

  current: IntentionActionPointerRestDto | undefined;
  ngOnInit(): void {
    this.current = this.instance?.action;
    if (this.instance?.server) {
      this.serverSelection = this.instance.server[0];
    }
  }
}
