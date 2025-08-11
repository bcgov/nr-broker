import { Component, OnInit, booleanAttribute, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IntentionUtilService } from '../../util/intention-util.service';

@Component({
  selector: 'app-action-content',
  imports: [MatTooltipModule],
  templateUrl: './action-content.component.html',
  styleUrls: ['./action-content.component.scss'],
})
export class ActionContentComponent implements OnInit {
  readonly intention = input<any>();
  readonly key = input.required<string>();
  readonly actionServiceFilter = input('');
  readonly showMultiple = input(false, { transform: booleanAttribute });
  values: string[] = [];

  constructor(private service: IntentionUtilService) {}

  ngOnInit(): void {
    const valueSet = this.service.actionValueSet(
      this.intention(),
      this.key(),
      this.actionServiceFilter(),
    );
    this.values = [...valueSet];
  }
}
