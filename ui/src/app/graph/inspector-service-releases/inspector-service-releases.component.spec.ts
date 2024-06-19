import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorServiceReleasesComponent } from './inspector-service-releases.component';

describe('InspectorServiceReleasesComponent', () => {
  let component: InspectorServiceReleasesComponent;
  let fixture: ComponentFixture<InspectorServiceReleasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorServiceReleasesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorServiceReleasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
