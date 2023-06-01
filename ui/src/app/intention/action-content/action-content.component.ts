import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { get } from 'radash';

@Component({
  selector: 'app-action-content',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './action-content.component.html',
  styleUrls: ['./action-content.component.scss'],
})
export class ActionContentComponent implements OnInit {
  @Input() intention: any;
  @Input() key!: string;
  values: string[] = [];

  ngOnInit(): void {
    const valueSet = new Set<string>(
      this.intention.actions.map((action: any) => {
        return get(action, this.key);
      }),
    );
    this.values = [...valueSet];
  }
}
