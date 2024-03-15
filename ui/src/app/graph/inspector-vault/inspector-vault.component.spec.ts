import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorVaultComponent } from './inspector-vault.component';

describe('InspectorVaultComponent', () => {
  let component: InspectorVaultComponent;
  let fixture: ComponentFixture<InspectorVaultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVaultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
