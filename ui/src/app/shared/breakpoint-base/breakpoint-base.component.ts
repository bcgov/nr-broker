import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-breakpoint-base',
  imports: [],
  template: '',
})
export class BreakpointBaseComponent {
  protected screenSize = signal('wide');
  private ngUnsubscribe = new Subject<any>();

  // Create a map from breakpoints to css class
  private displayNameMap = new Map([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'wide'],
    [Breakpoints.Large, 'wide'],
    [Breakpoints.XLarge, 'wide'],
  ]);

    constructor() {
      inject(BreakpointObserver)
        .observe([
          Breakpoints.XSmall,
          Breakpoints.Small,
          Breakpoints.Medium,
          Breakpoints.Large,
          Breakpoints.XLarge,
        ])
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe((result) => {
          for (const query of Object.keys(result.breakpoints)) {
            if (result.breakpoints[query]) {
              this.screenSize.set(this.displayNameMap.get(query) ?? 'Unknown');
            }
          }
        });
    }
}
