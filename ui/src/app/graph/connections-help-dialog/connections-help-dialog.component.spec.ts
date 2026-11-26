import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { ConnectionsHelpDialogComponent } from './connections-help-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('ConnectionsHelpDialogComponent', () => {
  let component: ConnectionsHelpDialogComponent;
  let fixture: ComponentFixture<ConnectionsHelpDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionsHelpDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { outboundEdges: [], inboundEdges: [], collectionName: 'service', navigationFollows: 'vertex' } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionsHelpDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('displays many-to-many for inbound and outbound connections', () => {
    const edge = {
      id: 'source',
      collection: 'repository',
      name: 'source',
      relation: 'manyToMany',
      show: true,
    } as CollectionEdgeConfig;
    component.data.inboundEdges.push({
      sourceCollectionName: 'Service',
      sourceCollection: 'service',
      edge,
    });
    component.data.outboundEdges.push({
      targetCollectionName: 'Repository',
      edge,
    });

    fixture.detectChanges();

    expect((fixture.nativeElement.textContent.match(/Many-to-many/g) ?? []).length).toBe(2);
  });
});
