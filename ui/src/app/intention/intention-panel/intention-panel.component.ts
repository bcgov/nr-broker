import { Component, effect, input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { IntentionDto } from '../../service/intention/dto/intention.dto';
import { IntentionApiService } from '../../service/intention-api.service';
import { IntentionDetailsComponent } from '../intention-details/intention-details.component';
import { ActionContentComponent } from '../action-content/action-content.component';

@Component({
  selector: 'app-intention-panel',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ClipboardModule,
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
    private readonly location: Location,
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

  back() {
    this.location.back();
    // this.router.navigate(['/intention/history']);
  }

  viewIntention(id: string) {
    this.router.navigate([`/intention/${id}`], {
      replaceUrl: true,
    });
  }
}
