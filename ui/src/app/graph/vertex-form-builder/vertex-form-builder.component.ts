import { Component, OnChanges, OnInit, output, SimpleChanges, input, inject, signal } from '@angular/core';
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
import { CollectionFieldConfigMap } from '../../service/persistence/dto/collection-config.dto';
import { VertexFormFieldComponent } from '../vertex-form-field/vertex-form-field.component';
import { uniqueNameValidator } from './unique-name.directive';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionDtoUnion } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-vertex-form-builder',
  templateUrl: './vertex-form-builder.component.html',
  styleUrls: ['./vertex-form-builder.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, VertexFormFieldComponent],
})
export class VertexFormBuilderComponent implements OnInit, OnChanges {
  private collectionService = inject(CollectionApiService);

  readonly formSubmitted = output();
  readonly collection = input.required<string>();
  readonly fieldMap = input.required<CollectionFieldConfigMap>();
  readonly data = input<any>();
  readonly formData = signal<any>({});
  form!: FormGroup;
  fieldConfigs!: CollectionFieldConfigNameMapped[];

  ngOnInit() {
    const fieldCtrls: Record<string, FormGroup | FormControl> = {};
    const fieldConfigs: CollectionFieldConfigNameMapped[] = [];
    if (this.data()) {
      this.formData.set(JSON.parse(JSON.stringify(this.data())));
    }

    for (const key of Object.keys(this.fieldMap())) {
      fieldConfigs.push({
        key,
        ...this.fieldMap()[key],
      });
    }

    for (const f of fieldConfigs) {
      const asyncValidators: AsyncValidatorFn[] = [];
      const validators: ValidatorFn[] = [];

      if (f.init) {
        if (f.init === 'uuid') {
          this.setFormDataDefault(f.key, () => uuidv4());
        }
        if (f.init === 'now') {
          this.setFormDataDefault(f.key, () => new Date().toISOString());
        }
      }

      // stringArray always exists even if empty so required is not needed
      if (f.required && f.type !== 'stringArray') {
        validators.push(Validators.required);
      }
      if (f.type === 'boolean') {
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ?? !!f.value,
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
          this.formData()[f.key] ?? 0,
          validators,
        );
      }
      if (f.type === 'string') {
        if (f.unique) {
          const uniqueValidator = uniqueNameValidator(
            this.collectionService,
            this.collection() as keyof CollectionDtoUnion,
            f.key,
            this.formData()['id'] ?? null,
          );
          asyncValidators.push(uniqueValidator);
        }
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ?? '',
          f.unique ? { updateOn: 'blur' } : {},
        );
        fieldCtrls[f.key].addValidators(validators);
        fieldCtrls[f.key].addAsyncValidators(asyncValidators);
      }
      if (f.type === 'stringArray') {
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ? this.formData()[f.key].join(', ') : '',
          validators,
        );
      }

      if (f.type === 'select') {
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ?? '',
          validators,
        );
      }

      if (f.type === 'email') {
        validators.push(Validators.email);
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ?? '',
          validators,
        );
      }

      if (f.type === 'date') {
        if (f.required) {
          validators.push(Validators.required);
        }
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ? this.formData()[f.key].slice(0, -1) : '',
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
          this.formData()[f.key] ?? '',
          validators,
        );
      }

      if (f.type === 'json') {
        fieldCtrls[f.key] = new FormControl(
          this.formData()[f.key] ? JSON.stringify(this.formData()[f.key], undefined, 4) : '',
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

  setFormDataDefault(key: string, value: () => any, truthy = true) {
    const keyVal = this.formData()[key];
    if ((truthy && keyVal) || (!truthy && keyVal === undefined)) {
      return;
    }
    this.formData.set({
      ...this.formData(),
      [key]: value(),
    });
  }

  setFormDataValue(key: string, value: any) {
    this.formData.set({
      ...this.formData(),
      [key]: value,
    });
  }

  submitForm() {
    this.formSubmitted.emit();
  }
}
