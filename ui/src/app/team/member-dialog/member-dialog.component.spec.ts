import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberDialogComponent } from './member-dialog.component';

describe('MemberDialogComponent', () => {
  let component: MemberDialogComponent;
  let fixture: ComponentFixture<MemberDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MemberDialogComponent],
    });
    fixture = TestBed.createComponent(MemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
