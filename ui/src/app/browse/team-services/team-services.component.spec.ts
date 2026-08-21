import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TeamServicesComponent } from './team-services.component';

describe('TeamServicesComponent', () => {
  let component: TeamServicesComponent;
  let fixture: ComponentFixture<TeamServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamServicesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamServicesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('teamVertex', '1');
    fixture.componentRef.setInput('userPermissions', { create: [], delete: [], sudo: [], update: [], approve: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
