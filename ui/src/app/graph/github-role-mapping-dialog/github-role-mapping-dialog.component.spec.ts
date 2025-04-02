import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubRoleMappingDialogComponent } from './github-role-mapping-dialog.component';

describe('GithubRoleMappingDialogComponent', () => {
  let component: GithubRoleMappingDialogComponent;
  let fixture: ComponentFixture<GithubRoleMappingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubRoleMappingDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GithubRoleMappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
