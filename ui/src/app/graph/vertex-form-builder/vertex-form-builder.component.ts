import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  AsyncValidatorFn,
} from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { CollectionFieldConfigNameMapped } from '../../service/graph.types';
import { CollectionFieldConfigMap } from '../../service/dto/collection-config-rest.dto';
import { VertexFormFieldComponent } from '../vertex-form-field/vertex-form-field.component';
import { uniqueNameValidator } from './unique-name.directive';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionDtoRestUnion } from '../../service/dto/collection-dto-union.type';
@Component({
  selector: 'app-vertex-form-builder',
  templateUrl: './vertex-form-builder.component.html',
  styleUrls: ['./vertex-form-builder.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, VertexFormFieldComponent],
})
export class VertexFormBuilderComponent implements OnInit, OnChanges {
  @Output() onSubmit = new EventEmitter();
  @Input() collection!: string;
  @Input() fieldMap!: CollectionFieldConfigMap;
  @Input() data!: any;
  form!: FormGroup;
  fieldConfigs!: CollectionFieldConfigNameMapped[];

  constructor(private collectionService: CollectionApiService) {}

  ngOnInit() {
    const fieldCtrls: { [key: string]: FormGroup | FormControl } = {};
    const fieldConfigs: CollectionFieldConfigNameMapped[] = [];
    if (!this.data) {
      this.data = {};
    }
    const data = JSON.parse(JSON.stringify(this.data));

    for (const key of Object.keys(this.fieldMap)) {
      fieldConfigs.push({
        key,
        ...this.fieldMap[key],
      });
    }

    for (const f of fieldConfigs) {
      const asyncValidators: AsyncValidatorFn[] = [];
      const validators: ValidatorFn[] = [];

      if (f.init) {
        if (f.init === 'uuid') {
          if (!data[f.key]) {
            data[f.key] = uuidv4();
          }
        }
        if (f.init === 'now') {
          data[f.key] = new Date();
        }
      }

      if (f.required) {
        validators.push(Validators.required);
      }
      if (f.type === 'boolean') {
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] !== undefined ? data[f.key] : !!f.value,
          validators,
        );
      }
      if (f.type === 'number') {
        if (f.required) {
          validators.push(Validators.required);
        }
        const pattern = new RegExp('^[0-9]*$', 'i');
        validators.push(Validators.pattern(pattern));
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? data[f.key] : 0,
          validators,
        );
      }
      if (f.type === 'string') {
        if (f.unique) {
          const uniqueValidator = uniqueNameValidator(
            this.collectionService,
            this.collection as keyof CollectionDtoRestUnion,
            f.key,
            data && data.id ? data.id : null,
          );
          asyncValidators.push(uniqueValidator);
        }
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? data[f.key] : '',
          f.unique ? { updateOn: 'blur' } : {},
        );
        fieldCtrls[f.key].addValidators(validators);
        fieldCtrls[f.key].addAsyncValidators(asyncValidators);
      }
      if (f.type === 'stringArray') {
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? data[f.key].join(', ') : '',
          validators,
        );
      }

      if (f.type === 'email') {
        validators.push(Validators.email);
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? data[f.key] : '',
          validators,
        );
      }

      if (f.type === 'date') {
        if (f.required) {
          validators.push(Validators.required);
        }
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? data[f.key].slice(0, -1) : '',
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
          data && data[f.key] ? data[f.key] : '',
          validators,
        );
      }

      if (f.type === 'json') {
        fieldCtrls[f.key] = new FormControl(
          data && data[f.key] ? JSON.stringify(data[f.key], undefined, 4) : '',
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
    }
    this.fieldConfigs = fieldConfigs;
    this.form = new FormGroup(fieldCtrls);
    this.form.disable();
    setTimeout(() => {
      this.form.enable();
    }, 100);
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
