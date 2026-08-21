import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InspectorInstallsComponent } from './inspector-installs.component';

describe('InspectorIntentionsComponent', () => {
  let component: InspectorInstallsComponent;
  let fixture: ComponentFixture<InspectorInstallsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorInstallsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(InspectorInstallsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pointers', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
