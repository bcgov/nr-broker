import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CURRENT_USER } from '../../app-initialize.factory';

import { UserAliasComponent } from './user-alias.component';

describe('UserAliasComponent', () => {
  let component: UserAliasComponent;
  let fixture: ComponentFixture<UserAliasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAliasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAliasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
