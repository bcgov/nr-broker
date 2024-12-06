import { Component, Input, OnInit } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import { get } from 'lodash';

@Component({
    selector: 'app-action-content',
    imports: [MatTooltipModule],
    templateUrl: './action-content.component.html',
    styleUrls: ['./action-content.component.scss']
})
export class ActionContentComponent implements OnInit {
  @Input() intention: any;
  @Input() key!: string;
  @Input() actionServiceFilter = '';
  values: string[] = [];

  ngOnInit(): void {
    const actions = this.intention?.actions ?? [];
    const valueSet = new Set<string>(
      actions
        .filter((action: any) => {
          return (
            this.actionServiceFilter === '' ||
            action.service.name === this.actionServiceFilter
          );
        })
        .map((action: any) => {
          return get(action, this.key);
        }),
    );
    this.values = [...valueSet];
  }
}
