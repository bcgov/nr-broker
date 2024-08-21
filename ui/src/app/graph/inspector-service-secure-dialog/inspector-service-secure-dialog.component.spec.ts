import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorServiceSecureDialogComponent } from './inspector-service-secure-dialog.component';

describe('InspectorServiceSecureDialogComponent', () => {
  let component: InspectorServiceSecureDialogComponent;
  let fixture: ComponentFixture<InspectorServiceSecureDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorServiceSecureDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorServiceSecureDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
