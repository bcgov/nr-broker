import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexTagsComponent } from './vertex-tags.component';

describe('VertexTagsComponent', () => {
  let component: VertexTagsComponent;
  let fixture: ComponentFixture<VertexTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexTagsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
