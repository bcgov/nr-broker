import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorInstancesComponent } from './inspector-instances.component';

describe('InspectorInstancesComponent', () => {
  let component: InspectorInstancesComponent;
  let fixture: ComponentFixture<InspectorInstancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorInstancesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorInstancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
