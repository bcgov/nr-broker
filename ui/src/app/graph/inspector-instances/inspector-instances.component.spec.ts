import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorInstancesComponent } from './inspector-instances.component';

describe('InspectorInstancesComponent', () => {
  let component: InspectorInstancesComponent;
  let fixture: ComponentFixture<InspectorInstancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorInstancesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorInstancesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('service', {} as any);
    fixture.componentRef.setInput('vertex', {} as any);
    fixture.componentRef.setInput('vertices', []);
    fixture.componentRef.setInput('details', {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
