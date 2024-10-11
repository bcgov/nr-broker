import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAliasComponent } from './user-alias.component';

describe('UserAliasComponent', () => {
  let component: UserAliasComponent;
  let fixture: ComponentFixture<UserAliasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAliasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAliasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
