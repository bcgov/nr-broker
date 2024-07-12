import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamServicesComponent } from './team-services.component';

describe('TeamServicesComponent', () => {
  let component: TeamServicesComponent;
  let fixture: ComponentFixture<TeamServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
