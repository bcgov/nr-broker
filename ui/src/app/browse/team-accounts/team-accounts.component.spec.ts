import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamAccountsComponent } from './team-accounts.component';

describe('TeamAccountsComponent', () => {
  let component: TeamAccountsComponent;
  let fixture: ComponentFixture<TeamAccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamAccountsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamAccountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
