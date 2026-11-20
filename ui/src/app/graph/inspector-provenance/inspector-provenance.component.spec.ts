import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';

import { InspectorProvenanceComponent } from './inspector-provenance.component';
import { ProvenanceDto, ProvenanceType } from '../../service/persistence/dto/provenance.dto';
import { TimestampDto } from '../../service/persistence/dto/timestamp.dto';

describe('InspectorProvenanceComponent', () => {
  let component: InspectorProvenanceComponent;
  let fixture: ComponentFixture<InspectorProvenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorProvenanceComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorProvenanceComponent);
    component = fixture.componentInstance;
  });

  function setProvenance(records: ProvenanceDto[] | undefined): void {
    fixture.componentRef.setInput('provenance', records);
    fixture.detectChanges();
  }

  function setTimestamps(createdAt?: number | string): void {
    fixture.componentRef.setInput(
      'timestamps',
      createdAt === undefined
        ? undefined
        : ({ createdAt } as unknown as TimestampDto),
    );
    fixture.detectChanges();
  }

  function record(type: ProvenanceType, updatedAt: string, extra: Partial<ProvenanceDto> = {}): ProvenanceDto {
    return {
      type,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt,
      ...extra,
    };
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('hides when there is no provenance', () => {
    setProvenance(undefined);
    expect(component.hasProvenance()).toBe(false);
    expect(component.showManualWarning()).toBe(false);
  });

  it('sorts records by most recently updated first', () => {
    setProvenance([
      record(ProvenanceType.MANUAL, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z'),
    ]);
    const sorted = component.sortedProvenance();
    expect(sorted.length).toBe(2);
    expect(sorted[0].record.type).toBe(ProvenanceType.CATALOG);
    expect(component.latestProvenance()?.record.type).toBe(ProvenanceType.CATALOG);
  });

  it('does not warn when the latest record is automated', () => {
    setProvenance([
      record(ProvenanceType.MANUAL, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z'),
    ]);
    expect(component.showManualWarning()).toBe(false);
  });

  it('warns when the latest record is manual and another source is present', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z'),
    ]);
    expect(component.showManualWarning()).toBe(true);
  });

  it('does not warn when the latest record is manual but no automated source is present', () => {
    setProvenance([record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z')]);
    expect(component.showManualWarning()).toBe(false);
  });

  it('warns when intention is the latest record and another automated source is present', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.INTENTION, '2024-01-05T00:00:00Z'),
    ]);
    expect(component.showManualWarning()).toBe(true);
  });

  it('does not treat intention as an automated overwrite source for warnings', () => {
    setProvenance([
      record(ProvenanceType.INTENTION, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z'),
    ]);
    expect(component.showManualWarning()).toBe(false);
  });

  it('keeps catalog repository and path on the display record', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z', {
        repository: 'https://github.com/example/repo',
        path: 'catalog-info.yaml',
      }),
    ]);
    expect(component.sortedProvenance()[0].repository).toBe('https://github.com/example/repo');
    expect(component.sortedProvenance()[0].path).toBe('catalog-info.yaml');
  });

  it('builds a GitHub link to the catalog file using the default branch HEAD ref', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z', {
        repository: 'https://github.com/example/repo',
        path: 'components/web/catalog-info.yaml',
      }),
    ]);
    const source = component.sortedProvenance()[0];
    expect(component.catalogFileUrl(source)).toBe(
      'https://github.com/example/repo/blob/HEAD/components/web/catalog-info.yaml',
    );
  });

  it('trims a trailing slash on the repository url when building the link', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z', {
        repository: 'https://github.com/example/repo/',
        path: 'catalog-info.yaml',
      }),
    ]);
    const source = component.sortedProvenance()[0];
    expect(component.catalogFileUrl(source)).toBe(
      'https://github.com/example/repo/blob/HEAD/catalog-info.yaml',
    );
  });

  it('does not build a link when the repository is not a GitHub url', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z', {
        repository: 'https://gitlab.com/example/repo',
        path: 'catalog-info.yaml',
      }),
    ]);
    const source = component.sortedProvenance()[0];
    expect(component.catalogFileUrl(source)).toBeUndefined();
  });

  it('does not build a link when the path is missing', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z', {
        repository: 'https://github.com/example/repo',
      }),
    ]);
    const source = component.sortedProvenance()[0];
    expect(component.catalogFileUrl(source)).toBeUndefined();
  });

  it('hides the remove button unless removing is allowed', () => {
    setProvenance([record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z')]);
    expect(fixture.nativeElement.querySelector('button.provenance-item-badge')).toBeNull();
  });

  it('emits the record when the remove button is selected', () => {
    const manual = record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z');
    fixture.componentRef.setInput('canRemove', true);
    setProvenance([manual]);
    const removed: ProvenanceDto[] = [];
    component.removeRecord.subscribe((r) => removed.push(r));

    fixture.nativeElement.querySelector('button.provenance-item-badge').click();
    expect(removed).toEqual([manual]);
  });

  it('links intention provenance to filtered intention history', () => {
    setProvenance([
      record(ProvenanceType.INTENTION, '2024-01-05T00:00:00Z', {
        intentionId: '65a123456789012345678901',
      }),
    ]);

    const link = fixture.debugElement
      .query(By.css('.provenance-item-badge-link'))
      .injector.get(RouterLink);
    expect(link.urlTree?.toString()).toBe(
      '/intention/history;field=id;value=65a123456789012345678901',
    );
  });

  it('collapses to the most recent source by default', () => {
    setProvenance([
      record(ProvenanceType.MANUAL, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z'),
      record(ProvenanceType.INTENTION, '2024-01-04T00:00:00Z'),
    ]);
    expect(component.displayProvenance().length).toBe(1);
    expect(component.displayProvenance()[0].record.type).toBe(ProvenanceType.CATALOG);
    expect(component.hasAdditional()).toBe(true);
    expect(component.additionalCount()).toBe(2);
  });

  it('expands to the full list when toggled', () => {
    setProvenance([
      record(ProvenanceType.MANUAL, '2024-01-02T00:00:00Z'),
      record(ProvenanceType.CATALOG, '2024-01-05T00:00:00Z'),
    ]);
    expect(component.displayProvenance().length).toBe(1);
    component.toggleExpanded();
    fixture.detectChanges();
    expect(component.displayProvenance().length).toBe(2);
    expect(component.expanded()).toBe(true);
  });

  it('has no additional count when a single source is present', () => {
    setProvenance([record(ProvenanceType.MANUAL, '2024-01-05T00:00:00Z')]);
    expect(component.hasAdditional()).toBe(false);
    expect(component.displayProvenance().length).toBe(1);
  });

  it('marks the source as creator when its created time is within the item window', () => {
    const itemCreatedAt = new Date('2024-01-01T00:00:00Z').getTime() + 500;
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-03T00:00:00Z', { createdAt: '2024-01-01T00:00:00Z' }),
    ]);
    setTimestamps(itemCreatedAt);
    expect(component.isCreator(component.sortedProvenance()[0])).toBe(true);
  });

  it('does not mark the source when its created time is outside the item window', () => {
    const itemCreatedAt = new Date('2024-01-01T00:00:00Z').getTime() + 2000;
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-03T00:00:00Z', { createdAt: '2024-01-01T00:00:00Z' }),
    ]);
    setTimestamps(itemCreatedAt);
    expect(component.isCreator(component.sortedProvenance()[0])).toBe(false);
  });

  it('does not mark a creator when the item created time is unknown', () => {
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-03T00:00:00Z', { createdAt: '2024-01-01T00:00:00Z' }),
    ]);
    setTimestamps(undefined);
    expect(component.isCreator(component.sortedProvenance()[0])).toBe(false);
  });

  it('matches creation dates that display the same second when the item timestamp is an ISO string', () => {
    const itemCreatedAt = '2024-01-01T00:00:00.500Z';
    setProvenance([
      record(ProvenanceType.CATALOG, '2024-01-02T00:00:00Z', {
        createdAt: '2024-01-01T00:00:00Z',
      }),
      record(ProvenanceType.INTENTION, '2024-01-03T00:00:00Z', {
        createdAt: '2024-01-03T00:00:00Z',
      }),
    ]);
    setTimestamps(itemCreatedAt);

    const creator = component.creatorProvenance();
    expect(creator?.record.type).toBe(ProvenanceType.CATALOG);
    expect(component.displayProvenance().map((source) => source.record.type)).toEqual([
      ProvenanceType.INTENTION,
    ]);
    expect(component.additionalCount()).toBe(1);
  });
});
