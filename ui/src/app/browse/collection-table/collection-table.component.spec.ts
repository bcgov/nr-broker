import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_ARR, CONFIG_RECORD, CURRENT_USER } from '../../app-initialize.factory';

import { CollectionTableComponent } from './collection-table.component';

// Build a per-collection config record so each collection can control its own
// `showUserRoles` flag.
function buildConfigRecord(showUserRolesByCollection: Record<string, boolean> = {}) {
  return new Proxy(
    {},
    {
      get: (_t, prop: string) => ({
        edges: [],
        color: '000000',
        name: prop,
        browseFields: [],
        fields: {},
        fieldDefaultSort: { field: 'name', direction: 1 },
        showUserRoles: showUserRolesByCollection[prop] === true,
      }),
    },
  );
}

describe('CollectionTableComponent', () => {
  let component: CollectionTableComponent;
  let fixture: ComponentFixture<CollectionTableComponent>;

  // Creates the component with the given per-collection config record and the
  // `collection` input already set so the component's effects can run safely.
  // Returns the component so callers can set the remaining inputs and re-detect.
  async function create(
    collection: 'user' | 'service' | 'team' | 'project' = 'service',
    showUserRolesByCollection: Record<string, boolean> = {},
  ): Promise<CollectionTableComponent> {
    await TestBed.configureTestingModule({
      imports: [CollectionTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_ARR, useValue: [] },
        { provide: CONFIG_RECORD, useValue: buildConfigRecord(showUserRolesByCollection) },
        {
          provide: CURRENT_USER,
          useValue: {
            domain: 'idir',
            email: 'test@example.com',
            guid: '1',
            name: 'Test',
            username: 'test',
            roles: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', collection);
    fixture.detectChanges();
    return component;
  }

  it('should create', async () => {
    const comp = await create('service');
    expect(comp).toBeTruthy();
  });

  describe('showUserRoles (Roles button gating)', () => {
    it('shows the Roles button when viewing upstream users of a target that enables showUserRoles', async () => {
      await create('user', { repository: true });
      fixture.componentRef.setInput('direction', 'upstream');
      fixture.componentRef.setInput('target', {
        collection: 'repository',
        vertex: 'repo-1',
        name: 'My Repo',
        options: [],
      });
      fixture.detectChanges();
      expect(component.showUserRoles()).toBe(true);
    });

    it('hides the Roles button when viewing a non-user upstream connection even if the target enables showUserRoles', async () => {
      // Regression: a repository's upstream connections (service, team, project,
      // brokerAccount) must not show the Roles button.
      await create('service', { repository: true });
      fixture.componentRef.setInput('direction', 'upstream');
      fixture.componentRef.setInput('target', {
        collection: 'repository',
        vertex: 'repo-1',
        name: 'My Repo',
        options: [],
      });
      fixture.detectChanges();
      expect(component.showUserRoles()).toBe(false);
    });

    it('hides the Roles button for a downstream view of users', async () => {
      await create('user', { repository: true });
      fixture.componentRef.setInput('direction', 'downstream');
      fixture.componentRef.setInput('target', {
        collection: 'repository',
        vertex: 'repo-1',
        name: 'My Repo',
        options: [],
      });
      fixture.detectChanges();
      expect(component.showUserRoles()).toBe(false);
    });

    it('hides the Roles button when the target collection does not enable showUserRoles', async () => {
      await create('user', { project: false });
      fixture.componentRef.setInput('direction', 'upstream');
      fixture.componentRef.setInput('target', {
        collection: 'project',
        vertex: 'proj-1',
        name: 'My Project',
        options: [],
      });
      fixture.detectChanges();
      expect(component.showUserRoles()).toBe(false);
    });
  });
});
