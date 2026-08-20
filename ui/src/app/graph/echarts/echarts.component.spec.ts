import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CONFIG_ARR, INITIAL_PREFERENCES } from '../../app-initialize.factory';

import { EchartsComponent } from './echarts.component';

describe('EchartsComponent', () => {
  let component: EchartsComponent;
  let fixture: ComponentFixture<EchartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EchartsComponent],
      providers: [
        { provide: CONFIG_ARR, useValue: [] },
        { provide: INITIAL_PREFERENCES, useValue: { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, graphVertexVisibility: {}, graphEdgeSrcTarVisibility: {}, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EchartsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dataConfig', of({ data: { vertices: [], edges: [], categories: [] }, config: {}, configSrcTarMap: {}, permissions: { create: [], delete: [], sudo: [], update: [], approve: [] } } as any));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
