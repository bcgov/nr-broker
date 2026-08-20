import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorEdgeComponent } from './inspector-edge.component';

describe('InspectorEdgeComponent', () => {
  let component: InspectorEdgeComponent;
  let fixture: ComponentFixture<InspectorEdgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorEdgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorEdgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('edge', {} as any);
    fixture.componentRef.setInput('sourceVertex', {} as any);
    fixture.componentRef.setInput('targetVertex', {} as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
