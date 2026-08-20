import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_ARR, CONFIG_RECORD, CURRENT_USER } from '../../app-initialize.factory';

import { CollectionTableComponent } from './collection-table.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test', browseFields: [], fields: {}, fieldDefaultSort: { field: 'name', direction: 1 } };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('CollectionTableComponent', () => {
  let component: CollectionTableComponent;
  let fixture: ComponentFixture<CollectionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_ARR, useValue: [] },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
