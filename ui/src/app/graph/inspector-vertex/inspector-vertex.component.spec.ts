import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorVertexComponent } from './inspector-vertex.component';

describe('InspectorVertexComponent', () => {
  let component: InspectorVertexComponent;
  let fixture: ComponentFixture<InspectorVertexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVertexComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVertexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
