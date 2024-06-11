import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionInspectorComponent } from './collection-inspector.component';

describe('CollectionInspectorComponent', () => {
  let component: CollectionInspectorComponent;
  let fixture: ComponentFixture<CollectionInspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionInspectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionInspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
