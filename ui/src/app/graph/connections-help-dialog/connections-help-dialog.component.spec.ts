import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONFIG_RECORD } from '../../app-initialize.factory';
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
