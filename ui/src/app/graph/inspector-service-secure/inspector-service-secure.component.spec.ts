import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorServiceSecureComponent } from './inspector-service-secure.component';

describe('InspectorServiceSecureComponent', () => {
  let component: InspectorServiceSecureComponent;
  let fixture: ComponentFixture<InspectorServiceSecureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorServiceSecureComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InspectorServiceSecureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
