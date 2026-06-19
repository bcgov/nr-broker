import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-team-role-chip',
  imports: [MatRippleModule, MatTooltipModule],
  templateUrl: './team-role-chip.component.html',
  styleUrl: './team-role-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TeamRoleChipComponment {
  readonly label = input.required<string>();
  readonly iconSrc = input.required<string>();
  readonly tooltip = input<string>('');
  readonly chipClick = output<void>();

  onClick(): void {
    this.chipClick.emit();
  }
}
