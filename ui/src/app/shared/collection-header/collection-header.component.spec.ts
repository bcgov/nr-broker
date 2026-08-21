import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { CollectionHeaderComponent } from './collection-header.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test', fields: {}, permissions: { browse: false, create: false, filter: false, update: false, delete: false } };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('CollectionHeaderComponent', () => {
  let component: CollectionHeaderComponent;
  let fixture: ComponentFixture<CollectionHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.componentRef.setInput('title', 'Test');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
