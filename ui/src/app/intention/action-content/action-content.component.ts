import { Component, OnInit, input } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import get from 'lodash.get';

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
  values: string[] = [];

  ngOnInit(): void {
    const actions = this.intention()?.actions ?? [];
    const valueSet = new Set<string>(
      actions
        .filter((action: any) => {
          const actionServiceFilter = this.actionServiceFilter();
          return (
            actionServiceFilter === '' ||
            action.service.name === actionServiceFilter
          );
        })
        .map((action: any) => {
          return get(action, this.key());
        }),
    );
    this.values = [...valueSet];
  }
}
