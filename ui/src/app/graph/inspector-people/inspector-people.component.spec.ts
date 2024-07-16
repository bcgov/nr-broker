import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorPeopleComponent } from './inspector-people.component';

describe('InspectorPeopleComponent', () => {
  let component: InspectorPeopleComponent;
  let fixture: ComponentFixture<InspectorPeopleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPeopleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorPeopleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
