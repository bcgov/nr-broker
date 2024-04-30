import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorReleasesComponent } from './inspector-releases.component';

describe('InspectorReleasesComponent', () => {
  let component: InspectorReleasesComponent;
  let fixture: ComponentFixture<InspectorReleasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorReleasesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorReleasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
