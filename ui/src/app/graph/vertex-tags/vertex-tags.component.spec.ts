import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { VertexTagsComponent } from './vertex-tags.component';
import { CONFIG_RECORD } from '../../app-initialize.factory';

describe('VertexTagsComponent', () => {
  let component: VertexTagsComponent;
  let fixture: ComponentFixture<VertexTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexTagsComponent],
      providers: [
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexTagsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'project');
    fixture.componentRef.setInput('collectionData', { vertex: 'v1', name: 'test' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
