import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubSecretsDialogComponent } from './github-secrets-dialog.component';

describe('GithubSecretsDialogComponent', () => {
  let component: GithubSecretsDialogComponent;
  let fixture: ComponentFixture<GithubSecretsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubSecretsDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GithubSecretsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
