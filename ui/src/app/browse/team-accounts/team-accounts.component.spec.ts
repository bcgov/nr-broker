import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TeamAccountsComponent } from './team-accounts.component';

describe('TeamAccountsComponent', () => {
  let component: TeamAccountsComponent;
  let fixture: ComponentFixture<TeamAccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamAccountsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamAccountsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('teamVertex', '1');
    fixture.componentRef.setInput('hasSudo', false);
    fixture.componentRef.setInput('hasUpdate', false);
    fixture.componentRef.setInput('config', { edges: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
