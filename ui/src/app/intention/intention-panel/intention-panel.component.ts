import { Component, effect, input } from '@angular/core';
import { IntentionApiService } from '../../service/intention-api.service';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
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
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-intention-panel',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
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
  ) {
    effect(() => {
      const err = this.intentionResource.error() as HttpErrorResponse;
      if (err) {
        this.router.navigate([
          '/error',
          {
            code: err.status,
            message: err.statusText,
            error: err.message,
          },
        ]);
      }
    });
  }

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
