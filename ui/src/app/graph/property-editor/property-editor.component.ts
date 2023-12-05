import { Component, Input, OnInit } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-property-editor',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './property-editor.component.html',
  styleUrls: ['./property-editor.component.scss'],
})
export class PropertyEditorComponent implements OnInit {
  @Input() graphProperties: any;

  properties: {
    key: FormControl<string | null>;
    value: FormControl<string | null>;
  }[] = [];

  ngOnInit(): void {
    if (this.graphProperties) {
      for (const key of Object.keys(this.graphProperties)) {
        this.addProperty(key, this.graphProperties[key]);
      }
    }
  }

  addProperty(key = '', value = '') {
    this.properties.push({
      key: new FormControl<string>(key),
      value: new FormControl<string>(value),
    });
    return false;
  }

  removeProperty(property: any) {
    this.properties = this.properties.filter((p) => {
      return p !== property;
    });
  }

  getPropertyValues() {
    if (this.properties.length === 0) {
      return {};
    }
    return {
      prop: this.properties.reduce(
        (pv, cv) => {
          if (cv.key.value && cv.value.value) {
            pv[cv.key.value] = cv.value.value;
          }
          return pv;
        },
        {} as { [key: string]: string },
      ),
    };
  }
}
