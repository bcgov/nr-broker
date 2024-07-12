import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorConnectionsComponent } from './inspector-connections.component';

describe('InspectorConnectionsComponent', () => {
  let component: InspectorConnectionsComponent;
  let fixture: ComponentFixture<InspectorConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorConnectionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
