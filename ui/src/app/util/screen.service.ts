import { Injectable, computed, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ScreenService {
  private breakpointObserver = inject(BreakpointObserver);

  // Observe multiple breakpoints
  private breakpointsMap = {
    XSmall: Breakpoints.XSmall,
    Small: Breakpoints.Small,
    Medium: Breakpoints.Medium,
    Large: Breakpoints.Large,
    XLarge: Breakpoints.XLarge,
    Handset: Breakpoints.Handset,
    Tablet: Breakpoints.Tablet,
    Web: Breakpoints.Web,
  };

  private breakpointState$ = this.breakpointObserver.observe(Object.values(this.breakpointsMap));

  // Convert observable → signal
  private breakpointState = toSignal(this.breakpointState$, {
    initialValue: { matches: false, breakpoints: {} } as BreakpointState,
  });

  // Derived signals
  readonly activeBreakpoints = computed(() => {
    const state = this.breakpointState();
    if (!state || !state.breakpoints) return [];
    return Object.entries(state.breakpoints)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, matched]) => matched)
      .map(([key]) => key);
  });

  readonly isXSmall = computed(() => !!this.breakpointState().breakpoints[this.breakpointsMap.XSmall]);
  readonly isSmall = computed(() => !!this.breakpointState().breakpoints[this.breakpointsMap.Small]);
  readonly isMedium = computed(() => !!this.breakpointState().breakpoints[this.breakpointsMap.Medium]);
  readonly isLarge = computed(() => !!this.breakpointState().breakpoints[this.breakpointsMap.Large]);
  readonly isXLarge = computed(() => !!this.breakpointState().breakpoints[this.breakpointsMap.XLarge]);

  // Example: combine logic for convenience
  readonly isHandset = computed(() => this.isXSmall() || this.isSmall());
  readonly isDesktop = computed(() => this.isMedium() || this.isLarge() || this.isXLarge());
  readonly screenSize = computed(() => this.isDesktop() ? 'wide' : 'narrow');
}
