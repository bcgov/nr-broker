import { Component, computed, inject, input, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

import { IntentionApiService } from '../../service/intention-api.service';
import { IntentionDto } from '../../service/intention/dto/intention.dto';

@Component({
  selector: 'app-intention-reference-item',
  imports: [MatIconModule],
  templateUrl: './intention-reference-item.component.html',
  styleUrl: './intention-reference-item.component.scss',
})
export class IntentionReferenceItemComponent {
  private readonly intentionApi = inject(IntentionApiService);

  readonly intentionId = input.required<string>();
  readonly action = input<string | undefined>();
  readonly viewIntentionEvent = output<string>();

  readonly intentionResource = httpResource<IntentionDto>(() =>
    this.intentionApi.getIntentionArgs(this.intentionId()),
  );

  readonly label = computed(() => {
    const value = this.intentionResource.value();
    if (value?.actions?.[0]?.service) {
      const svc = value.actions[0].service;
      return `${svc.project} / ${svc.name}`;
    }
    return this.intentionId();
  });

  viewIntention() {
    this.viewIntentionEvent.emit(this.intentionId());
  }
}
