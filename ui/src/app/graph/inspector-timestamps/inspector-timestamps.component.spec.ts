import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorTimestampsComponent } from './inspector-timestamps.component';

describe('InspectorTimestampsComponent', () => {
  let component: InspectorTimestampsComponent;
  let fixture: ComponentFixture<InspectorTimestampsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorTimestampsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorTimestampsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
