import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LinkSnackbarComponent } from './link-snackbar.component';

describe('LinkSnackbarComponent', () => {
  let component: LinkSnackbarComponent;
  let fixture: ComponentFixture<LinkSnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkSnackbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatSnackBarRef, useValue: { dismissWithAction: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkSnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
