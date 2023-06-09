import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountGenerateDialogComponent } from './account-generate-dialog.component';

describe('AccountGenerateDialogComponent', () => {
  let component: AccountGenerateDialogComponent;
  let fixture: ComponentFixture<AccountGenerateDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountGenerateDialogComponent],
    });
    fixture = TestBed.createComponent(AccountGenerateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
