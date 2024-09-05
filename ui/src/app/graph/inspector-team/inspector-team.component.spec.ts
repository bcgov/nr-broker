import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorTeamComponent } from './inspector-team.component';

describe('InspectorTeamComponent', () => {
  let component: InspectorTeamComponent;
  let fixture: ComponentFixture<InspectorTeamComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorTeamComponent],
    });
    fixture = TestBed.createComponent(InspectorTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
