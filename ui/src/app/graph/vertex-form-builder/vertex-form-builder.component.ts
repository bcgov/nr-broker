import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { NgFor } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { CollectionFieldConfigNameMapped } from '../../service/graph.types';
import { CollectionFieldConfigMap } from '../../service/dto/collection-config-rest.dto';
import { VertexFormFieldComponent } from '../vertex-form-field/vertex-form-field.component';
@Component({
  selector: 'app-vertex-form-builder',
  templateUrl: './vertex-form-builder.component.html',
  styleUrls: ['./vertex-form-builder.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgFor, VertexFormFieldComponent],
})
export class VertexFormBuilderComponent implements OnInit, OnChanges {
  @Output() onSubmit = new EventEmitter();
  @Input() fieldMap!: CollectionFieldConfigMap;
  @Input() data!: any;
  form!: FormGroup;
  fieldConfigs!: CollectionFieldConfigNameMapped[];

  ngOnInit() {
    const fieldCtrls: { [key: string]: FormGroup | FormControl } = {};
    const fieldConfigs: CollectionFieldConfigNameMapped[] = [];

    for (const key of Object.keys(this.fieldMap)) {
      fieldConfigs.push({
        key,
        ...this.fieldMap[key],
      });
    }

    for (const f of fieldConfigs) {
      const validators: ValidatorFn[] = [];
      if (f.required) {
        validators.push(Validators.required);
      }
      if (f.type === 'boolean') {
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key] !== undefined
            ? this.data[f.key]
            : !!f.value,
          validators,
        );
      }
      if (f.type === 'string') {
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key] ? this.data[f.key] : '',
          validators,
        );
      }
      if (f.type === 'stringArray') {
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key] ? this.data[f.key].join(', ') : '',
          validators,
        );
      }

      if (f.type === 'email') {
        validators.push(Validators.email);
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key] ? this.data[f.key] : '',
          validators,
        );
      }

      if (f.type === 'url') {
        const pattern = new RegExp(
          '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', // fragment locator
          'i',
        );
        validators.push(Validators.pattern(pattern));
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key] ? this.data[f.key] : '',
          validators,
        );
      }

      if (f.type === 'json') {
        fieldCtrls[f.key] = new FormControl(
          this.data && this.data[f.key]
            ? JSON.stringify(this.data[f.key], undefined, 4)
            : '',
          validators,
        );
      }
      // else {
      //   // If checkbox, it needs mulitple
      //   const opts: { [key: string]: FormControl } = {};
      //   for (const opt of f.options) {
      //     opts[opt.key] = new FormControl(opt.value);
      //   }
      //   fieldCtrls[f.key] = new FormGroup(opts);
      // }
      if (f.init && f.init === 'uuid') {
        if (!this.data) {
          this.data = {};
        }
        if (!this.data[f.key]) {
          this.data[f.key] = uuidv4();
        }
      }
    }
    this.fieldConfigs = fieldConfigs;
    this.form = new FormGroup(fieldCtrls);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fieldMap']) {
      this.ngOnInit();
    }
  }

  submitForm() {
    this.onSubmit.emit();
  }
}
