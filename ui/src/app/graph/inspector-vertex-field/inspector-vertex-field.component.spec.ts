import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorVertexFieldComponent } from './inspector-vertex-field.component';

describe('InspectorVertexFieldComponent', () => {
  let component: InspectorVertexFieldComponent;
  let fixture: ComponentFixture<InspectorVertexFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVertexFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVertexFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
