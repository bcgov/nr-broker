import { Component, computed, inject, input, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

import { IntentionApiService } from '../../service/intention-api.service';
import { IntentionDto } from '../../service/intention/dto/intention.dto';
import { IntentionUtilService } from '../../util/intention-util.service';

@Component({
  selector: 'app-intention-reference-item',
  imports: [MatIconModule],
  templateUrl: './intention-reference-item.component.html',
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
      return `${svc.project} / ${svc.name}  #${value.id}`;
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

  readonly packageLabel = computed(() => {
    const value = this.intentionAction();
    if (value?.package) {
      const pkg = value.package;
      return `${pkg.name} v${pkg.version ?? ''} #${value.id}`;
    }
    return '';
  });

  viewIntention() {
    this.viewIntentionEvent.emit(this.intentionId());
  }
}
