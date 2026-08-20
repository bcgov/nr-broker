import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorVaultComponent } from './inspector-vault.component';

describe('InspectorVaultComponent', () => {
  let component: InspectorVaultComponent;
  let fixture: ComponentFixture<InspectorVaultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorVaultComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorVaultComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('service', {} as any);
    fixture.componentRef.setInput('isAdministrator', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
