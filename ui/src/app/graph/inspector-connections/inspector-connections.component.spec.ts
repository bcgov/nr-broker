import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { InspectorConnectionsComponent } from './inspector-connections.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('InspectorConnectionsComponent', () => {
  let component: InspectorConnectionsComponent;
  let fixture: ComponentFixture<InspectorConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorConnectionsComponent],
      providers: [{ provide: CONFIG_RECORD, useValue: mockConfigRecord }],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorConnectionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('comboData', { vertex: { collection: 'service' }, collection: {}, upstream: [], downstream: [] } as any);
    fixture.componentRef.setInput('hasAdmin', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
