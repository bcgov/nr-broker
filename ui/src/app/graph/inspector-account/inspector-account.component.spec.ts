import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorAccountComponent } from './inspector-account.component';

describe('InspectorAccountComponent', () => {
  let component: InspectorAccountComponent;
  let fixture: ComponentFixture<InspectorAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorAccountComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorAccountComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', {} as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
