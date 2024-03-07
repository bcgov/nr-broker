import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorInstanceDialogComponent } from './inspector-instance-dialog.component';

describe('InspectorInstanceDialogComponent', () => {
  let component: InspectorInstanceDialogComponent;
  let fixture: ComponentFixture<InspectorInstanceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorInstanceDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorInstanceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
