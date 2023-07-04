import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorInstallsComponent } from './inspector-installs.component';

describe('InspectorIntentionsComponent', () => {
  let component: InspectorInstallsComponent;
  let fixture: ComponentFixture<InspectorInstallsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorInstallsComponent],
    });
    fixture = TestBed.createComponent(InspectorInstallsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
