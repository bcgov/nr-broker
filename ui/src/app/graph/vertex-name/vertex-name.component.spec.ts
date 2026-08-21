import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexNameComponent } from './vertex-name.component';

describe('VertexNameComponent', () => {
  let component: VertexNameComponent;
  let fixture: ComponentFixture<VertexNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexNameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexNameComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vertex', { name: 'test', parentName: undefined });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
