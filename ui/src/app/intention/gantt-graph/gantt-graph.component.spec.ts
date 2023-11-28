import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GanttGraphComponent } from './gantt-graph.component';

describe('GanttGraphComponent', () => {
  let component: GanttGraphComponent;
  let fixture: ComponentFixture<GanttGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GanttGraphComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GanttGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
