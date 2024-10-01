import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphPropViewerDialogComponent } from './graph-prop-viewer-dialog.component';

describe('GraphPropViewerDialogComponent', () => {
  let component: GraphPropViewerDialogComponent;
  let fixture: ComponentFixture<GraphPropViewerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphPropViewerDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphPropViewerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
