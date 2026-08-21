import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRENT_USER } from '../../app-initialize.factory';

import { RolesDialogComponent } from './roles-dialog.component';

describe('RolesDialogComponent', () => {
  let component: RolesDialogComponent;
  let fixture: ComponentFixture<RolesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesDialogComponent],
      providers: [
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
