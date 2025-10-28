import { Component, OnInit, booleanAttribute, input, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IntentionUtilService } from '../../util/intention-util.service';

@Component({
  selector: 'app-action-content',
  imports: [MatTooltipModule],
  templateUrl: './action-content.component.html',
  styleUrls: ['./action-content.component.scss'],
})
export class ActionContentComponent implements OnInit {
  private service = inject(IntentionUtilService);

  readonly intention = input<any>();
  readonly key = input.required<string>();
  readonly actionServiceFilter = input('');
  readonly showMultiple = input(false, { transform: booleanAttribute });
  values: string[] = [];

  ngOnInit(): void {
    const valueSet = this.service.actionValueSet(
      this.intention(),
      this.key(),
      this.actionServiceFilter(),
    );
    this.values = [...valueSet];
  }
}
