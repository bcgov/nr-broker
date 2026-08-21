import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { TeamMembersComponent } from './team-members.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('TeamMembersComponent', () => {
  let component: TeamMembersComponent;
  let fixture: ComponentFixture<TeamMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamMembersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamMembersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('teamId', '1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach((r) => r.flush(null));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
