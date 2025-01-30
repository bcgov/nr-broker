import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorRepositorySyncComponent } from './inspector-repository-sync.component';

describe('InspectorRepositorySyncComponent', () => {
  let component: InspectorRepositorySyncComponent;
  let fixture: ComponentFixture<InspectorRepositorySyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorRepositorySyncComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorRepositorySyncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
