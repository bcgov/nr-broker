import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexFormBuilderComponent } from './vertex-form-builder.component';

describe('VertexFormBuilderComponent', () => {
  let component: VertexFormBuilderComponent;
  let fixture: ComponentFixture<VertexFormBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VertexFormBuilderComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(VertexFormBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
