import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultDialogComponent } from './vault-dialog.component';

describe('VaultDialogComponent', () => {
  let component: VaultDialogComponent;
  let fixture: ComponentFixture<VaultDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDialogComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(VaultDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
