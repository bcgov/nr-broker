import { Component, OnInit, computed, input, signal } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CollectionEdgePrototype,
  CollectionFieldConfig,
} from '../../service/persistence/dto/collection-config.dto';

@Component({
  selector: 'app-property-editor',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './property-editor.component.html',
  styleUrls: ['./property-editor.component.scss'],
})
export class PropertyEditorComponent implements OnInit {
  readonly graphProperties = input<Record<string, any>>();
  readonly prototype = input<CollectionEdgePrototype>();

  properties = signal<{
    key: FormControl<string | null>;
    value: FormControl<string | null>;
  }[]>([]);

  missingProperties = computed(() => {
    const proto = this.prototype();
    if (!proto?.property) {
      return [];
    }
    const currentKeys = this.properties()
      .map((p) => p.key.value)
      .filter((k) => k !== null);
    return Object.entries(proto.property)
      .filter(([key]) => !currentKeys.includes(key))
      .map(([key, config]) => ({ key, config }));
  });

  missingPropertiesLength = computed(() => {
    return this.missingProperties().length;
  });

  ngOnInit(): void {
    const graphProperties = this.graphProperties();
    if (graphProperties) {
      for (const key of Object.keys(graphProperties)) {
        this.addProperty(key, graphProperties[key]);
      }
    }
  }

  getHint(key: string | null): string | undefined {
    if (!key) return undefined;
    return this.prototype()?.property?.[key]?.hint;
  }

  addProperty(key = '', value = '') {
    this.properties.set([
      ...this.properties(),
      {
        key: new FormControl<string>(key),
        value: new FormControl<string>(value),
      },
    ]);
    return false;
  }

  addMissingProperty(key: string, config: CollectionFieldConfig) {
    const defaultValue =
      config.value !== undefined ? String(config.value) : '';
    this.addProperty(key, defaultValue);
    return false;
  }

  addAllMissingProperties() {
    for (const { key, config } of this.missingProperties()) {
      this.addMissingProperty(key, config);
    }
    return false;
  }

  removeProperty(property: any) {
    this.properties.set(this.properties().filter((p) => {
      return p !== property;
    }));
    return false;
  }

  getPropertyValues() {
    if (this.properties().length === 0) {
      return {};
    }
    return {
      prop: this.properties().reduce(
        (pv, cv) => {
          if (cv.key.value && cv.value.value) {
            pv[cv.key.value] = cv.value.value;
          }
          return pv;
        },
        {} as Record<string, string>,
      ),
    };
  }
}
