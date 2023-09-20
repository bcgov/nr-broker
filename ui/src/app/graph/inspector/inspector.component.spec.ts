import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { InspectorComponent } from './inspector.component';

describe('InspectorComponent', () => {
  let component: InspectorComponent;
  let fixture: ComponentFixture<InspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorComponent, HttpClientModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
