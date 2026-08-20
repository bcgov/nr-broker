import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { GithubRoleMappingDialogComponent } from './github-role-mapping-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('GithubRoleMappingDialogComponent', () => {
  let component: GithubRoleMappingDialogComponent;
  let fixture: ComponentFixture<GithubRoleMappingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubRoleMappingDialogComponent],
      providers: [
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GithubRoleMappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
