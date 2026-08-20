import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { InspectorPeopleComponent } from './inspector-people.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('InspectorPeopleComponent', () => {
  let component: InspectorPeopleComponent;
  let fixture: ComponentFixture<InspectorPeopleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPeopleComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorPeopleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'user');
    fixture.componentRef.setInput('vertex', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
