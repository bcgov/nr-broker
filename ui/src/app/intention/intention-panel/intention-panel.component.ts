import { Component, input } from '@angular/core';
import { IntentionApiService } from '../../service/intention-api.service';
import { httpResource } from '@angular/common/http';
import { IntentionDetailsComponent } from '../intention-details/intention-details.component';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { IntentionDto } from '../../service/intention/dto/intention.dto';
import prettyMilliseconds from 'pretty-ms';
import { ActionContentComponent } from '../action-content/action-content.component';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-intention-panel',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DetailsItemComponent,
    IntentionDetailsComponent,
    ActionContentComponent,
  ],
  templateUrl: './intention-panel.component.html',
  styleUrl: './intention-panel.component.scss',
})
export class IntentionPanelComponent {
  id = input.required<string>();

  intentionResource = httpResource<IntentionDto>(() => {
    return this.intentionApi.getIntentionArgs(this.id());
  });

  constructor(
    private readonly router: Router,
    private readonly intentionApi: IntentionApiService,
  ) {}

  totalDuration(intention: any) {
    return intention.transaction.duration
      ? prettyMilliseconds(intention.transaction.duration)
      : 0;
  }

  back() {
    this.router.navigate(['/intention/history']);
  }

  viewIntention(id: string) {
    this.router.navigate([`/intention/${id}`], {
      replaceUrl: true,
    });
  }
}
