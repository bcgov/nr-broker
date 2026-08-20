import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AccountGenerateDialogComponent } from './account-generate-dialog.component';

describe('AccountGenerateDialogComponent', () => {
  let component: AccountGenerateDialogComponent;
  let fixture: ComponentFixture<AccountGenerateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountGenerateDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { accountId: '123' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountGenerateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
