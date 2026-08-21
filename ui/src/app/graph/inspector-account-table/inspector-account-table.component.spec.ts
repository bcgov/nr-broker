import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorAccountTableComponent } from './inspector-account-table.component';

describe('InspectorAccountTableComponent', () => {
  let component: InspectorAccountTableComponent;
  let fixture: ComponentFixture<InspectorAccountTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorAccountTableComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(InspectorAccountTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('display', 'table');
    fixture.componentRef.setInput('tokenData', []);
    fixture.componentRef.setInput('showHelp', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
