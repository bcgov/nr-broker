import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionsHelpDialogComponent } from './connections-help-dialog.component';

describe('ConnectionsHelpDialogComponent', () => {
  let component: ConnectionsHelpDialogComponent;
  let fixture: ComponentFixture<ConnectionsHelpDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionsHelpDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionsHelpDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
