import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ServiceInstanceRestDto } from '../../service/dto/service-instance-rest.dto';
import { IntentionActionPointerRestDto } from '../../service/dto/intention-action-pointer-rest.dto';
import { IntentionApiService } from '../../service/intention-api.service';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';

@Component({
  selector: 'app-inspector-installs',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    MatMenuModule,
    MatListModule,
    MatTooltipModule,
    OutcomeIconComponent,
  ],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent implements OnInit {
  @Input() instance!: ServiceInstanceRestDto | undefined;

  current: IntentionActionPointerRestDto | undefined;

  constructor(
    private readonly router: Router,
    private readonly intention: IntentionApiService,
  ) {}

  ngOnInit(): void {
    this.current = this.instance?.action;
    this.navigate(0);
  }

  viewIntention(id: string) {
    this.router.navigate([
      '/intention/history',
      {
        index: 0,
        size: 10,
        field: 'id',
        value: id,
        status: 'all',
      },
    ]);
  }

  navigateCurrent() {
    this.current = this.instance?.action;
  }

  navigate(move: number) {
    if (!this.instance || !this.current || !this.instance.actionHistory) {
      return;
    }
    const index = this.instance.actionHistory.findIndex(
      (history) => history.intention === this.current?.intention,
    );
    const history = this.instance.actionHistory[index + move];
    if (!history) {
      return;
    }
    const actionId = history.action?.split('#').pop();
    this.intention.getIntention(history.intention).subscribe((result) => {
      if (this.current) {
        this.current = {
          ...history,
          source: {
            intention: result,
            action: result.actions.find(
              (action: any) => action.id === actionId,
            ),
          },
        };
      }
    });
  }

  isFirst() {
    if (!this.instance || !this.current || !this.instance.actionHistory) {
      return true;
    }

    return this.current.intention === this.instance.actionHistory[0].intention;
  }

  isLast() {
    if (!this.instance || !this.current || !this.instance.actionHistory) {
      return true;
    }

    return (
      this.current.intention ===
      this.instance.actionHistory[this.instance.actionHistory.length - 1]
        .intention
    );
  }
}
