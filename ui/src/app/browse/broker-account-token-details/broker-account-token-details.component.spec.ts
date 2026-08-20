import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BrokerAccountTokenDetailsComponent } from './broker-account-token-details.component';

describe('BrokerAccountTokenDetailsComponent', () => {
  let component: BrokerAccountTokenDetailsComponent;
  let fixture: ComponentFixture<BrokerAccountTokenDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrokerAccountTokenDetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BrokerAccountTokenDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach((r) => r.flush(null));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
