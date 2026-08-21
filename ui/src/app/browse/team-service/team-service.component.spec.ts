import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { TeamServiceComponent } from './team-service.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('TeamServiceComponent', () => {
  let component: TeamServiceComponent;
  let fixture: ComponentFixture<TeamServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamServiceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamServiceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('service', { edge: { prototype: { targetName: 'Test', name: 'Test', target: 'service' } } } as any);
    fixture.componentRef.setInput('userPermissions', { create: [], delete: [], sudo: [], update: [], approve: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
