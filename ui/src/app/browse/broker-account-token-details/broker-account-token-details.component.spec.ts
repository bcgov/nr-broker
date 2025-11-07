import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrokerAccountTokenDetailsComponent } from './broker-account-token-details.component';

describe('BrokerAccountTokenDetailsComponent', () => {
  let component: BrokerAccountTokenDetailsComponent;
  let fixture: ComponentFixture<BrokerAccountTokenDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrokerAccountTokenDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrokerAccountTokenDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
