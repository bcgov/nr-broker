import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionConnectionComponent } from './collection-connection.component';

describe('CollectionConnectionComponent', () => {
  let component: CollectionConnectionComponent;
  let fixture: ComponentFixture<CollectionConnectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionConnectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionConnectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
