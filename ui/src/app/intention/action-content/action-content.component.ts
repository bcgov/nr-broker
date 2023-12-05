import { Component, Input, OnInit } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import { get } from 'radash';

@Component({
  selector: 'app-action-content',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './action-content.component.html',
  styleUrls: ['./action-content.component.scss'],
})
export class ActionContentComponent implements OnInit {
  @Input() intention: any;
  @Input() key!: string;
  values: string[] = [];

  ngOnInit(): void {
    const actions = this.intention?.actions ?? [];
    const valueSet = new Set<string>(
      actions.map((action: any) => {
        return get(action, this.key);
      }),
    );
    this.values = [...valueSet];
  }
}
