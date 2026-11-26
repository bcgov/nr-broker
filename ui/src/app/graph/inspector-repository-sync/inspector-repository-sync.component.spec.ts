import { ComponentFixture, TestBed } from '@angular/core/testing';
import { formatDate } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { InspectorRepositorySyncComponent } from './inspector-repository-sync.component';
import { CONFIG_RECORD, SYNC_QUEUE_CONFIG_RECORD } from '../../app-initialize.factory';
import { HealthStatusService } from '../../service/health-status.service';
import { SyncStatusDto } from '../../service/persistence/dto/sync-status.dto';

describe('InspectorRepositorySyncComponent', () => {
  let component: InspectorRepositorySyncComponent;
  let fixture: ComponentFixture<InspectorRepositorySyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorRepositorySyncComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CONFIG_RECORD, useValue: {} },
        { provide: SYNC_QUEUE_CONFIG_RECORD, useValue: { secrets: { label: 'Secrets', description: [] } } },
        { provide: HealthStatusService, useValue: { healthSignal: () => ({
          details: { syncQueue: { queues: { secrets: { enabled: true } } } },
        }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorRepositorySyncComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.componentRef.setInput('data', {} as any);
    fixture.componentRef.setInput('collectionConfig', { edges: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function showStatus(status: SyncStatusDto) {
    fixture.componentRef.setInput('collection', 'repository');
    fixture.componentRef.setInput('collectionConfig', {
      syncQueues: [{ queue: { queue: 'secrets', queuedStatusProperty: 'syncSecretsStatus' } }],
    });
    fixture.componentRef.setInput('data', { id: 'repository', syncSecretsStatus: status });
    fixture.detectChanges();
  }

  function items(): Record<string, string> {
    const element = fixture.nativeElement as HTMLElement;
    return Object.fromEntries([...element.querySelectorAll('app-details-item')].map((item) => [
      item.querySelector('.details-header')?.textContent?.trim() ?? '',
      item.querySelector('.details-line')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    ]));
  }

  function statusItem(): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    return [...element.querySelectorAll('app-details-item')]
      .find((item) => item.querySelector('.details-header')?.textContent?.trim() === 'Sync status') as HTMLElement;
  }

  function statusDate(value: number): string {
    return formatDate(value, 'medium', 'en-US').replace(/\s+/g, ' ');
  }

  for (const [state, label] of [
    ['success', 'Successful'],
    ['failure', 'Failed'],
    ['partial', 'Partially completed'],
    ['skipped', 'Skipped'],
  ] as const) {
    it(`shows the ${state} result`, () => {
      showStatus({ syncAt: 1000, state });

      expect(items()['Sync status']).toBe(`${label} · ${statusDate(1000)}`);
      expect(Object.keys(items())).toEqual(['Secrets', 'Sync status']);
      expect(statusItem().querySelector('br')).toBeNull();
      expect(statusItem().querySelector('.details-line-wrap')).toBeNull();
    });
  }

  it('shows the queued time and opens the previous error details in a dialog', async () => {
    showStatus({ queuedAt: 2000, syncAt: 1000, state: 'partial', errorCode: '403', errorMessage: 'Access denied' });

    expect(items()['Sync status']).toBe(`Queued · ${statusDate(2000)}`);
    expect(Object.keys(items())).toEqual(['Secrets', 'Sync status']);

    expect(statusItem().getAttribute('role')).toBe('button');
    expect(statusItem().getAttribute('tabindex')).toBe('0');
    expect(statusItem().querySelector('button')).toBeNull();
    statusItem().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = document.querySelector('mat-dialog-container');
    expect(dialog?.textContent).toContain('Last result: Partially completed');
    expect(dialog?.textContent).toContain(formatDate(1000, 'medium', 'en-US'));
    expect(dialog?.textContent).toContain('Error code: 403');
    expect(dialog?.textContent).toContain('Access denied');
    expect(dialog?.textContent).toContain('Close');
  });

  it('does not show a result for an older status without a state', () => {
    showStatus({ syncAt: 1000 });

    expect(items()['Sync status']).toBe(`Last sync · ${statusDate(1000)}`);
    expect(statusItem().hasAttribute('role')).toBe(false);
    statusItem().click();
    expect(document.querySelector('mat-dialog-container')).toBeNull();
  });

  it('shows a queued first sync without a previous result or details', () => {
    showStatus({ queuedAt: 2000 });

    expect(items()['Sync status']).toBe(`Queued · ${statusDate(2000)}`);
    expect(statusItem().hasAttribute('tabindex')).toBe(false);
  });

  it('shows that the sync has not run when none has been queued or completed', () => {
    showStatus({});

    expect(items()['Sync status']).toBe('Not synced yet');
  });

  it('opens details with the keyboard when only an error message is present', async () => {
    showStatus({ syncAt: 1000, state: 'failure', errorMessage: 'Access denied' });

    statusItem().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = document.querySelector('mat-dialog-container');
    expect(dialog?.textContent).toContain('Access denied');
    expect(dialog?.textContent).not.toContain('Error code:');
  });
});
