import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamSummaryComponent } from './team-summary.component';

describe('TeamSummaryComponent', () => {
  let component: TeamSummaryComponent;
  let fixture: ComponentFixture<TeamSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
