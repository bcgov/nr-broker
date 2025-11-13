import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorPeopleDialogComponent } from './inspector-people-dialog.component';

describe('InspectorPeopleDialogComponent', () => {
  let component: InspectorPeopleDialogComponent;
  let fixture: ComponentFixture<InspectorPeopleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPeopleDialogComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(InspectorPeopleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
