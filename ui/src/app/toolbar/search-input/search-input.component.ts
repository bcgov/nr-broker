import { Component, Inject } from '@angular/core';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  GraphTypeaheadData,
  GraphTypeaheadResult,
} from '../../service/graph/dto/graph-typeahead-result.dto';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GraphApiService } from '../../service/graph-api.service';
import { GraphUtilService } from '../../service/graph-util.service';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { VertexNameComponent } from '../../graph/vertex-name/vertex-name.component';
import { CollectionApiService } from '../../service/collection-api.service';
import { Router } from '@angular/router';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-search-input',
  imports: [
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatDividerModule,
    CommonModule,
    VertexNameComponent,
  ],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
})
export class SearchInputComponent {
  filteredOptions!: Observable<any>;
  searchControl = new FormControl<{ id: string } | string | undefined>(
    undefined,
  );

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly graphApi: GraphApiService,
    private readonly router: Router,
    private readonly graphUtil: GraphUtilService,
    @Inject(CONFIG_RECORD)
    public readonly configMap: CollectionConfigNameRecord,
  ) {}

  ngOnInit(): void {
    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 2) {
          return this.graphApi.doTypeaheadSearch(searchTerm);
        }
        return of({
          meta: {
            total: 0,
          },
          data: [],
        });
      }),
      map((result: GraphTypeaheadResult) => {
        const groups = result.data.reduce(
          (groups, item) => {
            if (!groups[item.collection]) {
              groups[item.collection] = [];
            }
            groups[item.collection].push(item);
            return groups;
          },
          {} as Record<string, GraphTypeaheadData[]>,
        );
        const sortedKeys = Object.keys(groups).sort();

        return sortedKeys.map((key) => {
          return {
            collection: this.configMap[key as CollectionNames].name,
            data: groups[key].sort((a, b) => a.name.localeCompare(b.name)),
          };
        });
      }),
    );
  }

  displayFn(vertex: GraphTypeaheadData): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }

  onTypeaheadOptionClick($event: MouseEvent, option: GraphTypeaheadData) {
    if (
      option.collection === 'serviceInstance' ||
      this.graphUtil.isGraphOpen() ||
      $event.altKey
    ) {
      this.graphUtil.openInGraph(option.id, 'vertex');
    } else {
      this.collectionApi
        .searchCollection(option.collection, {
          vertexId: option.id,
          offset: 0,
          limit: 1,
        })
        .subscribe((result) => {
          if (result && result.meta.total > 0) {
            this.router.navigate(
              ['/browse', option.collection, result.data[0].collection.id],
              {
                replaceUrl: true,
              },
            );
          }
        });
      this.searchControl?.reset();
    }
  }
}
