import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkSnackbarComponent } from './link-snackbar.component';

describe('LinkSnackbarComponent', () => {
  let component: LinkSnackbarComponent;
  let fixture: ComponentFixture<LinkSnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkSnackbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkSnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
