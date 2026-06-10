import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { IntentionApiService } from '../../service/intention-api.service';
import { IntentionDto } from '../../service/intention/dto/intention.dto';
import { IntentionUtilService } from '../../util/intention-util.service';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-intention-reference-item',
  imports: [
    TitleCasePipe,
  ],
  templateUrl: './intention-reference-item.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './intention-reference-item.component.scss',
})
export class IntentionReferenceItemComponent {
  private readonly intentionApi = inject(IntentionApiService);
  private readonly intentionUtil = inject(IntentionUtilService);

  readonly intentionId = input.required<string>();
  readonly action = input<string | undefined>();
  readonly viewIntentionEvent = output<string>();

  readonly intentionResource = httpResource<IntentionDto>(() =>
    this.intentionApi.getIntentionArgs(this.intentionId()),
  );

  readonly intentionAction = computed(() => {
    const intention = this.intentionResource.value();
    if (intention && this.action()) {
      return this.intentionUtil.filterActions(
        intention.actions,
        this.intentionUtil.actionToOptions(this.action()!),
      )[0];
    }
    return undefined;
  });

  readonly label = computed(() => {
    const value = this.intentionAction();
    if (value?.service) {
      const svc = value.service;
      return `${svc.project} / ${svc.name} #${value.id}`;
    }
    return this.intentionId();
  });

  readonly name = computed(() => {
    const value = this.intentionAction();
    if (value?.package) {
      const pkg = value.package;
      return pkg.name ?? '';
    }
    return '';
  });

  readonly version = computed(() => {
    const value = this.intentionAction();
    if (value?.package) {
      const pkg = value.package;
      return pkg.version ?? '';
    }
    return '';
  });

  readonly category = computed(() => {
    const value = this.intentionAction();
    if (value?.package) {
      const pkg = value.package;
      return pkg.category ?? '';
    }
    return '';
  });

  viewIntention() {
    this.viewIntentionEvent.emit(this.intentionId());
  }
}
