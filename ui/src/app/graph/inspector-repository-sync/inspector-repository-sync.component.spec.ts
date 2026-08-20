import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorRepositorySyncComponent } from './inspector-repository-sync.component';

describe('InspectorRepositorySyncComponent', () => {
  let component: InspectorRepositorySyncComponent;
  let fixture: ComponentFixture<InspectorRepositorySyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorRepositorySyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorRepositorySyncComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.componentRef.setInput('data', {} as any);
    fixture.componentRef.setInput('collectionConfig', { edges: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
