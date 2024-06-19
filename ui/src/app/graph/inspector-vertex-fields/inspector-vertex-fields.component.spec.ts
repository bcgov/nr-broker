import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorVertexFieldsComponent } from './inspector-vertex-fields.component';

describe('InspectorVertexFieldsComponent', () => {
  let component: InspectorVertexFieldsComponent;
  let fixture: ComponentFixture<InspectorVertexFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVertexFieldsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVertexFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
