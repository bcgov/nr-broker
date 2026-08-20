import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorVertexComponent } from './inspector-vertex.component';

describe('InspectorVertexComponent', () => {
  let component: InspectorVertexComponent;
  let fixture: ComponentFixture<InspectorVertexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVertexComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVertexComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.componentRef.setInput('collectionConfig', { edges: [], fields: {} } as any);
    fixture.componentRef.setInput('comboData', { vertex: { collection: 'service' }, collection: { tags: [] }, upstream: [], downstream: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
