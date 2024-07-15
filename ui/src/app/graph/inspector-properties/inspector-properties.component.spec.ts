import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorPropertiesComponent } from './inspector-properties.component';

describe('InspectorPropertiesComponent', () => {
  let component: InspectorPropertiesComponent;
  let fixture: ComponentFixture<InspectorPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPropertiesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
