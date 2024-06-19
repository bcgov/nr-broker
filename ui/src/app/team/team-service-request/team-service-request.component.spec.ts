import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamServiceRequestComponent } from './team-service-request.component';

describe('TeamServiceRequestComponent', () => {
  let component: TeamServiceRequestComponent;
  let fixture: ComponentFixture<TeamServiceRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamServiceRequestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamServiceRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
