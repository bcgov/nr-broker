import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamRolesComponent } from './team-roles.component';

describe('TeamRolesComponent', () => {
  let component: TeamRolesComponent;
  let fixture: ComponentFixture<TeamRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
