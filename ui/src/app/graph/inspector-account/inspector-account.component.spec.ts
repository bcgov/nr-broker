import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorAccountComponent } from './inspector-account.component';

describe('InspectorAccountComponent', () => {
  let component: InspectorAccountComponent;
  let fixture: ComponentFixture<InspectorAccountComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorAccountComponent]
    });
    fixture = TestBed.createComponent(InspectorAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
