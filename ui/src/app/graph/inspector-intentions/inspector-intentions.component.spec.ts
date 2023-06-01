import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorIntentionsComponent } from './inspector-intentions.component';

describe('InspectorIntentionsComponent', () => {
  let component: InspectorIntentionsComponent;
  let fixture: ComponentFixture<InspectorIntentionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorIntentionsComponent]
    });
    fixture = TestBed.createComponent(InspectorIntentionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
